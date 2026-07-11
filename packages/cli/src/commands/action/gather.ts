import {getItem, type Shipload} from '@shipload/sdk'
import {type Action, Checksum256} from '@wharfkit/antelope'
import {Command} from 'commander'
import {
    ALL_ENTITY_TYPES,
    type EntityTypeName,
    parseEntityType,
    parseUint16,
    parseUint32,
    parseUint64,
} from '../../lib/args'
import {decideUseRecharge} from '../../lib/auto-recharge'
import {getGameSeed, getShipload, server} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {assertNotBoth, printError, resolvePreflightError, withValidation} from '../../lib/errors'
import {estimateGather} from '../../lib/estimate'
import {renderIssues} from '../../lib/feasibility'
import {formatItem} from '../../lib/format'
import {projectedCargoMass, projectedCoords} from '../../lib/projection'
import {reachDepth, resolveReach, shallowestPerItem} from '../../lib/reach'
import {renderEstimate} from '../../lib/render-estimate'
import {transact} from '../../lib/session'
import {getEntitySnapshot} from '../../lib/snapshot'
import {checkCapacity, checkDepth, ValidationError} from '../../lib/validate'
import {
    AUTO_RESOLVE_OPTION,
    maybeAwaitAndPrint,
    TRACK_OPTION,
    WAIT_OPTION,
    type WaitableOptions,
} from '../../lib/wait'

export interface GatherOpts {
    source: {entityType: EntityTypeName; entityId: bigint}
    destination: {entityType: EntityTypeName; entityId: bigint}
    stratum: number
    quantity: number
    recharge: boolean
}

export async function buildAction(opts: GatherOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.gatherplan(
        opts.source.entityId,
        opts.destination.entityId,
        opts.stratum,
        opts.quantity,
        opts.recharge
    )
}

interface GatherErrorContext {
    sourceType: EntityTypeName
    sourceId: bigint
    stratum: number
}

async function preflightGather(opts: GatherOpts): Promise<void> {
    const src = await getEntitySnapshot(opts.source.entityId)
    const depth = reachDepth(src.gatherer_lanes ?? [])
    checkDepth(depth, opts.stratum)

    const coords = projectedCoords(src)
    const stratumData = (await server.readonly('getstratum', {
        x: coords.x,
        y: coords.y,
        stratum: opts.stratum,
    })) as unknown as {
        stratum: {
            item_id: number | bigint | {toString(): string}
            reserve: number | bigint | {toString(): string}
        }
    }
    const itemIdRaw = stratumData?.stratum?.item_id
    if (itemIdRaw === undefined || itemIdRaw === null) {
        throw new ValidationError(`Stratum ${opts.stratum} not present at current location.`)
    }
    const itemId = Number(itemIdRaw.toString())
    if (itemId === 0) {
        throw new ValidationError(`Stratum ${opts.stratum} has no resource at this location.`)
    }

    const dest =
        opts.destination.entityType === opts.source.entityType &&
        opts.destination.entityId === opts.source.entityId
            ? src
            : await getEntitySnapshot(opts.destination.entityId)

    const item = getItem(itemId)
    const itemMass = item.mass
    const capacity = Number((dest.capacity ?? 0).toString())
    const currentMass = Number(projectedCargoMass(dest))
    checkCapacity(capacity, currentMass, itemMass, opts.quantity)
}

async function enrichDepthError(ctx: GatherErrorContext, headline: string): Promise<string> {
    try {
        const [reach, gameSeed, stateRaw] = await Promise.all([
            resolveReach({entityType: ctx.sourceType, entityId: ctx.sourceId}),
            getGameSeed(),
            server.table('state').get(),
        ])
        const depth = reach.gatherer.depth
        const coord = {x: Number(reach.coords.x), y: Number(reach.coords.y)}
        // biome-ignore lint/suspicious/noExplicitAny: state row shape varies by contract version
        const state = stateRaw as any
        const epochSeed = state?.seed ? Checksum256.from(state.seed) : undefined

        const lines = [headline, `   ${ctx.sourceType}:${ctx.sourceId} gatherer depth: ${depth}`]

        if (epochSeed) {
            const leads = shallowestPerItem(gameSeed, epochSeed, coord)
            const reachable = leads.filter((l) => l.index <= depth)
            if (reachable.length > 0) {
                const top = reachable[0]
                lines.push(
                    `   Shallowest reachable at (${coord.x}, ${coord.y}): [${top.index}] ${formatItem(top.itemId)}, reserve ${top.reserve} — use that instead`
                )
            } else if (leads.length > 0) {
                const top = leads[0]
                lines.push(
                    `   Shallowest at (${coord.x}, ${coord.y}): [${top.index}] ${formatItem(top.itemId)}, reserve ${top.reserve}  (still out of depth)`
                )
            } else {
                lines.push(`   No resources present at (${coord.x}, ${coord.y}).`)
            }
        }

        return lines.join('\n')
    } catch {
        return headline
    }
}

export function gatherDepthHeadline(err: unknown, ctx: GatherErrorContext): string | undefined {
    const msg = err instanceof Error ? err.message : String(err)
    const raw = String(err)

    if (
        msg.includes('stratum exceeds gatherer depth') ||
        raw.includes('stratum exceeds gatherer depth')
    ) {
        return `✗ Cannot gather: stratum ${ctx.stratum} is out of depth.`
    }

    if (
        msg.includes('no gatherer reaches this stratum') ||
        raw.includes('no gatherer reaches this stratum')
    ) {
        return `✗ Cannot gather: no gatherer reaches stratum ${ctx.stratum}.`
    }

    return undefined
}

async function enrichGatherError(err: unknown, ctx: GatherErrorContext): Promise<string> {
    const msg = err instanceof Error ? err.message : String(err)
    const raw = String(err)

    const depthHeadline = gatherDepthHeadline(err, ctx)
    if (depthHeadline) {
        return enrichDepthError(ctx, depthHeadline)
    }

    if (msg.includes('insufficient energy') || raw.includes('insufficient energy')) {
        return `✗ Cannot gather: insufficient energy on ${ctx.sourceType}:${ctx.sourceId}. Run "shiploadcli ${ctx.sourceType} ${ctx.sourceId}" to inspect.`
    }

    if (msg.includes('cargo exceeds capacity') || raw.includes('cargo exceeds capacity')) {
        return `✗ Cannot gather: destination cargo would exceed capacity.`
    }

    return msg
}

type GatherCliOptions = WaitableOptions & {
    estimate?: boolean
    force?: boolean
    recharge?: boolean
    autoRecharge?: boolean
}

export async function runGather(
    ctx: EntityContext,
    destType: EntityTypeName,
    destId: bigint,
    stratum: number,
    quantity: number,
    options: GatherCliOptions
): Promise<void> {
    const gatherOpts: GatherOpts = {
        source: {entityType: ctx.entityType, entityId: ctx.entityId},
        destination: {entityType: destType, entityId: destId},
        stratum,
        quantity,
        recharge: false,
    }
    assertNotBoth(options, ['estimate', 'wait'], ['estimate', 'track'])
    const rechargeRequested = Boolean(options.recharge)
    const snap = await getEntitySnapshot(ctx.entityId)
    const est = await withValidation(() =>
        estimateGather({
            entityId: ctx.entityId,
            stratum,
            quantity,
            snapshot: snap,
            recharge: rechargeRequested,
        })
    )
    if (options.estimate) {
        console.log(renderEstimate(est))
        return
    }
    let preflightError: unknown
    try {
        await preflightGather(gatherOpts)
    } catch (err) {
        preflightError = err
    }
    const preflight = resolvePreflightError(preflightError, Boolean(options.force))
    if (preflight?.kind === 'abort') {
        process.exit(printError(preflight.error))
    }
    if (preflight?.kind === 'warn') {
        console.error(preflight.message)
    }
    const useRecharge = await decideUseRecharge({
        rechargeRequested,
        autoRecharge: Boolean(options.autoRecharge),
        baseEstimate: est,
        reestimateWithRecharge: () =>
            estimateGather({
                entityId: ctx.entityId,
                stratum,
                quantity,
                snapshot: snap,
                recharge: true,
            }),
    })
    if (!useRecharge && !est.feasibility.ok) {
        console.error(renderIssues(est.feasibility.issues))
        if (!options.force) process.exit(1)
    }
    const action = await buildAction({...gatherOpts, recharge: useRecharge})
    try {
        const result = await transact(
            {action},
            {
                description: useRecharge
                    ? `Recharge + gather ${quantity} from stratum ${stratum}`
                    : `Gathering ${quantity} from stratum ${stratum}`,
            }
        )
        await maybeAwaitAndPrint(ctx.entityId, options, result)
    } catch (err) {
        const enriched = await enrichGatherError(err, {
            sourceType: ctx.entityType,
            sourceId: ctx.entityId,
            stratum,
        })
        console.error(enriched)
        process.exit(1)
    }
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'gather',
    description: 'Gather resources from a stratum into a destination entity',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('gather')
            .description('Gather resources from a stratum into a destination entity')
            .addHelpText(
                'before',
                'Requires: idle source ship; gatherer module installed; stratum within gatherer depth; cargo capacity available.\n'
            )
            .addHelpText(
                'after',
                '\nReserve = remaining gatherable units at the stratum (resets each epoch). ' +
                    'Richness = stratum quality, 1–1000 (higher = faster gather).'
            )
            .argument('<dest-type>', 'destination entity type', parseEntityType)
            .argument('<dest-id>', 'destination entity id', parseUint64)
            .argument('<stratum>', 'stratum index', parseUint16)
            .argument('<quantity>', 'quantity to gather', parseUint32)
            .option('--estimate', 'print duration/energy/cargo estimate without submitting')
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .addOption(AUTO_RESOLVE_OPTION)
            .option('--force', 'submit despite failed feasibility checks (advanced)')
            .option('--recharge', 'insert recharge steps whenever a gather cycle needs them')
            .option(
                '--auto-recharge',
                'enable recharge steps only when projected energy is insufficient (--recharge always enables them)'
            )
            .action(
                async (
                    destType: EntityTypeName,
                    destId: bigint,
                    stratum: number,
                    quantity: number,
                    opts: GatherCliOptions
                ) => {
                    await runGather(ctx, destType, destId, stratum, quantity, opts)
                }
            ),
}
