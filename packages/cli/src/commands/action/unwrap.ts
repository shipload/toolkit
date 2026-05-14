import {
    type AtomicAssetRow,
    type AtomicSchemaRow,
    calc_acceleration,
    calc_flighttime,
    calc_orbital_altitude,
    decodeAtomicAsset,
    distanceBetweenPoints,
    fetchAtomicAssetsForOwner,
    fetchAtomicSchemas,
    formatMass,
    getItem,
    type ServerTypes,
    SHIPLOAD_COLLECTION,
} from '@shipload/sdk'
import {type AnyAction, UInt64} from '@wharfkit/antelope'
import {Command} from 'commander'
import {client, server} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {formatDuration, formatItem, jsonStringify} from '../../lib/format'
import {getAccountName, getSession, transact} from '../../lib/session'
import {ValidationError} from '../../lib/validate'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

const ATOMICASSETS_ACCOUNT = 'atomicassets'
const SERVER_ACCOUNT = 'shipload.gm'

interface ResolvedAsset {
    asset_id: bigint
    item_id: number
    quantity: number
    mass: number
    origin_x: bigint
    origin_y: bigint
    template_id: number
    schema_name: string
}

interface UnwrapPlan {
    owner: string
    entityType: string
    entityId: bigint
    assets: ResolvedAsset[]
    totalMass: number
    origin: {x: bigint; y: bigint}
    entityCoords: {x: bigint; y: bigint}
    capacity: bigint
    cargoMass: bigint
    capacityHeadroom: bigint
    loaders: {mass: bigint; thrust: bigint; quantity: bigint}
    entityTotalMass: bigint
    loadDuration: number
    transitTime: number
    totalDuration: number
}

async function loadTemplateMap(): Promise<Map<number, number>> {
    const rows = (await server.table('nftconfig').all()) as unknown as ServerTypes.nftconfig_row[]
    const m = new Map<number, number>()
    for (const r of rows) m.set(r.template_id.toNumber(), r.item_id.toNumber())
    return m
}

function indexSchemas(schemas: AtomicSchemaRow[]): Map<string, AtomicSchemaRow> {
    const m = new Map<string, AtomicSchemaRow>()
    for (const s of schemas) m.set(String(s.schema_name), s)
    return m
}

async function resolveAssets(owner: string, assetIds: bigint[]): Promise<ResolvedAsset[]> {
    const [allAssets, schemas, templateMap] = await Promise.all([
        fetchAtomicAssetsForOwner(client, owner, {collection: SHIPLOAD_COLLECTION}),
        fetchAtomicSchemas(client, SHIPLOAD_COLLECTION),
        loadTemplateMap(),
    ])
    const byId = new Map<bigint, AtomicAssetRow>()
    for (const a of allAssets) byId.set(BigInt(String(a.asset_id)), a)
    const schemaByName = indexSchemas(schemas)

    const resolved: ResolvedAsset[] = []
    for (const id of assetIds) {
        const asset = byId.get(id)
        if (!asset) {
            throw new ValidationError(
                `asset ${id} not owned by ${owner} in collection '${SHIPLOAD_COLLECTION}'`,
                `run \`shiploadcli nft ${owner}\` to list assets`
            )
        }
        const itemId = templateMap.get(Number(asset.template_id))
        if (itemId === undefined) {
            throw new ValidationError(
                `asset ${id} (template ${asset.template_id}) is not registered in nftconfig`,
                'item cannot be unwrapped — schema is not a Shipload NFT template'
            )
        }
        const schema = schemaByName.get(String(asset.schema_name))
        if (!schema) {
            throw new ValidationError(`asset ${id} schema '${asset.schema_name}' not found`)
        }
        const decoded = decodeAtomicAsset(asset, schema.format, itemId)
        const mass = getItem(itemId).mass * decoded.quantity
        resolved.push({
            asset_id: decoded.asset_id,
            item_id: itemId,
            quantity: decoded.quantity,
            mass,
            origin_x: decoded.origin_x,
            origin_y: decoded.origin_y,
            template_id: decoded.template_id,
            schema_name: decoded.schema_name,
        })
    }
    return resolved
}

async function buildPlan(
    ctx: EntityContext,
    owner: string,
    assetIds: bigint[]
): Promise<UnwrapPlan> {
    if (assetIds.length === 0) {
        throw new ValidationError('unwrap requires at least one asset-id')
    }
    const dupes = new Set<bigint>()
    for (const id of assetIds) {
        if (dupes.has(id)) {
            throw new ValidationError(`asset ${id} listed more than once`)
        }
        dupes.add(id)
    }

    const entityInfo = (await server.readonly('getentity', {
        entity_id: ctx.entityId,
    })) as unknown as ServerTypes.entity_info

    if (String(entityInfo.owner) !== owner) {
        throw new ValidationError(
            `${ctx.entityType} ${ctx.entityId} is owned by ${entityInfo.owner}, not ${owner}`
        )
    }
    if (!entityInfo.loaders) {
        throw new ValidationError(
            `${ctx.entityType} ${ctx.entityId} has no loader installed — entity must have loaders to unwrap`
        )
    }
    if (entityInfo.capacity == null) {
        throw new ValidationError(`${ctx.entityType} ${ctx.entityId} has no cargo capacity`)
    }

    const assets = await resolveAssets(owner, assetIds)

    const firstOrigin = {x: assets[0].origin_x, y: assets[0].origin_y}
    for (const a of assets) {
        if (a.origin_x !== firstOrigin.x || a.origin_y !== firstOrigin.y) {
            throw new ValidationError(
                'all NFTs in batch must share the same wrap origin',
                `asset ${a.asset_id} origin (${a.origin_x}, ${a.origin_y}) ≠ batch origin (${firstOrigin.x}, ${firstOrigin.y})`
            )
        }
    }

    const totalMass = assets.reduce((sum, a) => sum + a.mass, 0)
    const capacity = BigInt(entityInfo.capacity.toString())
    const cargoMass = BigInt(entityInfo.cargomass.toString())
    const headroom = capacity - cargoMass
    if (BigInt(totalMass) > headroom) {
        throw new ValidationError(
            `entity capacity would be exceeded: needs ${formatMass(totalMass)}, available ${formatMass(Number(headroom))}`
        )
    }

    const loaders = {
        mass: BigInt(entityInfo.loaders.mass.toString()),
        thrust: BigInt(entityInfo.loaders.thrust.toString()),
        quantity: BigInt(entityInfo.loaders.quantity.toString()),
    }

    const hullmass = BigInt(entityInfo.hullmass?.toString() ?? '0')
    const totalEntityMass = hullmass + cargoMass + loaders.mass * loaders.quantity
    const z = calc_orbital_altitude(Number(totalEntityMass))

    const loaderTotalMass = totalMass + Number(loaders.mass)
    const loaderAcceleration = calc_acceleration(Number(loaders.thrust), loaderTotalMass)
    const loadFlightTime = Number(calc_flighttime(z, loaderAcceleration))
    const loadDuration =
        loaders.quantity > 0n ? Math.floor(loadFlightTime / Number(loaders.quantity)) : 0

    const entityX = BigInt(entityInfo.coordinates.x.toString())
    const entityY = BigInt(entityInfo.coordinates.y.toString())
    const distance = distanceBetweenPoints(
        Number(entityX),
        Number(entityY),
        Number(firstOrigin.x),
        Number(firstOrigin.y)
    )
    const UNWRAP_THRUST = 400
    const acceleration = calc_acceleration(UNWRAP_THRUST, totalMass)
    const transitTime = Number(calc_flighttime(distance, acceleration))

    return {
        owner,
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        assets,
        totalMass,
        origin: firstOrigin,
        entityCoords: {x: entityX, y: entityY},
        capacity,
        cargoMass,
        capacityHeadroom: headroom,
        loaders,
        entityTotalMass: totalEntityMass,
        loadDuration,
        transitTime,
        totalDuration: loadDuration + transitTime,
    }
}

function buildAtomicTransferAction(plan: UnwrapPlan): AnyAction {
    const session = getSession()
    return {
        account: ATOMICASSETS_ACCOUNT,
        name: 'transfer',
        authorization: [{actor: session.actor, permission: session.permission}],
        data: {
            from: plan.owner,
            to: SERVER_ACCOUNT,
            asset_ids: plan.assets.map((a) => UInt64.from(a.asset_id.toString())),
            memo: `unwrap:${plan.entityType}:${plan.entityId}`,
        },
    }
}

function renderEstimate(plan: UnwrapPlan): string {
    const lines: string[] = []
    lines.push(
        `Estimate: unwrap ${plan.assets.length} NFT(s) into ${plan.entityType} ${plan.entityId}`
    )
    for (const a of plan.assets) {
        lines.push(
            `  asset ${a.asset_id}  ${formatItem(a.item_id)}  ×${a.quantity}  ${formatMass(a.mass)}`
        )
    }
    lines.push(`Origin:   (${plan.origin.x}, ${plan.origin.y})`)
    lines.push(`Target:   (${plan.entityCoords.x}, ${plan.entityCoords.y})`)
    lines.push(`Total mass: ${formatMass(plan.totalMass)}`)
    lines.push(
        `Capacity: ${formatMass(Number(plan.cargoMass))} used / ${formatMass(Number(plan.capacity))} (headroom ${formatMass(Number(plan.capacityHeadroom))})`
    )
    lines.push(
        `Duration: ${formatDuration(plan.totalDuration)}  (load ${formatDuration(plan.loadDuration)} + transit ${formatDuration(plan.transitTime)})`
    )
    return lines.join('\n')
}

function planToJson(plan: UnwrapPlan): unknown {
    return {
        owner: plan.owner,
        entity_type: plan.entityType,
        entity_id: plan.entityId.toString(),
        memo: `unwrap:${plan.entityType}:${plan.entityId}`,
        origin: {x: plan.origin.x.toString(), y: plan.origin.y.toString()},
        target: {x: plan.entityCoords.x.toString(), y: plan.entityCoords.y.toString()},
        total_mass: plan.totalMass,
        capacity: plan.capacity.toString(),
        cargo_mass: plan.cargoMass.toString(),
        capacity_headroom: plan.capacityHeadroom.toString(),
        load_duration_s: plan.loadDuration,
        transit_time_s: plan.transitTime,
        total_duration_s: plan.totalDuration,
        assets: plan.assets.map((a) => ({
            asset_id: a.asset_id.toString(),
            item_id: a.item_id,
            quantity: a.quantity,
            mass: a.mass,
            schema_name: a.schema_name,
            template_id: a.template_id,
        })),
    }
}

interface UnwrapCliOptions {
    estimate?: boolean
    wait?: boolean
    track?: boolean
    autoResolve?: boolean
    json?: boolean
}

export async function runUnwrap(
    ctx: EntityContext,
    assetIds: bigint[],
    options: UnwrapCliOptions
): Promise<void> {
    const owner = getAccountName()
    const plan = await buildPlan(ctx, owner, assetIds)

    if (options.estimate) {
        if (options.json) {
            console.log(jsonStringify(planToJson(plan)))
        } else {
            console.log(renderEstimate(plan))
        }
        return
    }

    const action = buildAtomicTransferAction(plan)
    const result = await transact(
        {action},
        {
            description: `Unwrapping ${plan.assets.length} NFT(s) into ${ctx.entityType} ${ctx.entityId}`,
        }
    )
    await maybeAwaitAndPrint(ctx.entityId, options, result)
}

function parseAssetId(s: string): bigint {
    if (!/^\d+$/.test(s)) {
        throw new ValidationError(`asset-id must be a non-negative integer (got "${s}")`)
    }
    return BigInt(s)
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'unwrap',
    description: 'Unwrap one or more AtomicAssets NFTs back into entity cargo',
    appliesTo: ['ship', 'warehouse'],
    build: (ctx) =>
        new Command('unwrap')
            .description('Unwrap one or more AtomicAssets NFTs back into entity cargo')
            .addHelpText(
                'before',
                'Requires: caller owns the target entity; entity has a loader; capacity headroom for the unwrapped mass.\n' +
                    'All NFTs in a batch must share the same wrap origin — transit time is charged from that origin.\n' +
                    'Submits an atomicassets::transfer with memo `unwrap:<entity-type>:<entity-id>`.\n'
            )
            .addHelpText(
                'after',
                `
Examples:
  shiploadcli warehouse 6 unwrap 1099511700000
  shiploadcli ship 1 unwrap 1099511700000 1099511700001 --estimate

Use \`shiploadcli nft\` to list asset ids you own.`
            )
            .argument('<asset-ids...>', 'one or more atomicassets asset ids')
            .option('--estimate', 'preview mass/duration without broadcasting')
            .option('--json', 'emit JSON instead of formatted text (with --estimate)')
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(async (rawIds: string[], opts: UnwrapCliOptions) => {
                const assetIds = rawIds.map(parseAssetId)
                await runUnwrap(ctx, assetIds, opts)
            }),
}
