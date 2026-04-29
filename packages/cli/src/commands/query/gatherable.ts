import {
    type ProjectableSnapshot,
    type ProjectedEntity,
    projectFromCurrentState,
} from '@shipload/sdk'
import {Command} from 'commander'
import {parseUint32} from '../../lib/args'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {
    type GatherableRenderOpts,
    type GatherableRow,
    gatherableToJsonShape,
    renderGatherableTable,
} from '../../lib/gatherable-render'
import {computeStratumGatherMetrics, type GathererCaps} from '../../lib/gatherable'
import {loadLocationStrata} from '../../lib/location-loader'
import {getEntitySnapshot} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'

interface GatherableOpts {
    projected?: boolean
    all?: boolean
    top?: number
    quantity: number
    json?: boolean
}

interface ResolvedEntityState {
    coords: {x: bigint; y: bigint}
    caps: GathererCaps
    energy: number
    energyCapacity: number
    cargoFreeKg: number
    cargoCapacityKg: number
    entityName?: string
}

function resolveState(
    snap: Awaited<ReturnType<typeof getEntitySnapshot>>,
    useProjected: boolean,
    ctx: EntityContext
): ResolvedEntityState {
    if (!snap.gatherer) {
        throw new ValidationError(
            `${ctx.entityType} ${ctx.entityId} has no gatherer module installed.`,
            `install one with: shiploadcli ${ctx.entityType} ${ctx.entityId} addmodule <slot> <gatherer-item-id>`
        )
    }
    // biome-ignore lint/suspicious/noExplicitAny: getentity readonly return is dynamic
    const raw = snap as any
    const caps: GathererCaps = {
        yield: Number(raw.gatherer.yield?.toString() ?? '0'),
        depth: Number(raw.gatherer.depth?.toString() ?? '0'),
        speed: Number(raw.gatherer.speed?.toString() ?? '0'),
        drain: Number(raw.gatherer.drain?.toString() ?? '0'),
    }

    const energyCapacity = Number(raw.generator?.capacity?.toString() ?? '0')
    const cargoCapacityKg = Number(raw.capacity?.toString() ?? '0')

    let coords = {
        x: BigInt(raw.coordinates.x.toString()),
        y: BigInt(raw.coordinates.y.toString()),
    }
    let energy = Number(raw.energy?.toString() ?? '0')
    let cargoFreeKg = cargoCapacityKg - Number(raw.cargomass?.toString() ?? '0')

    if (useProjected && snap.schedule && snap.schedule.tasks?.length > 0) {
        try {
            const projection: ProjectedEntity = projectFromCurrentState(
                snap as unknown as ProjectableSnapshot
            )
            coords = {
                x: BigInt(projection.location.x.toString()),
                y: BigInt(projection.location.y.toString()),
            }
            energy = Number(projection.energy.toString())
            cargoFreeKg = cargoCapacityKg - Number(projection.cargoMass.toString())
        } catch {
            // fall through to current state
        }
    }

    return {
        coords,
        caps,
        energy,
        energyCapacity,
        cargoFreeKg: Math.max(0, cargoFreeKg),
        cargoCapacityKg,
        entityName: raw.entity_name,
    }
}

async function runGatherable(ctx: EntityContext, opts: GatherableOpts): Promise<void> {
    if (opts.quantity <= 0) {
        throw new ValidationError('--quantity must be at least 1')
    }
    const useProjected = Boolean(opts.projected)
    const snap = await getEntitySnapshot(ctx.entityType, ctx.entityId)
    const state = resolveState(snap, useProjected, ctx)

    const view = await loadLocationStrata(state.coords)

    const allRows: GatherableRow[] = view.strata.map((stratum) => {
        const reachable = stratum.index <= state.caps.depth
        const metrics = reachable
            ? computeStratumGatherMetrics({
                  caps: state.caps,
                  budget: {energy: state.energy, cargoFreeKg: state.cargoFreeKg},
                  stratum,
                  quantity: opts.quantity,
              })
            : {
                  timeS: 0,
                  energyCost: 0,
                  maxQuantity: 0,
                  maxQuantityBound: null as null,
                  itemMassKg: 0,
                  gatherable: false,
              }
        return {stratum, reachable, metrics}
    })

    const reachableTotal = allRows.filter((r) => r.reachable).length
    const filtered = opts.all ? allRows : allRows.filter((r) => r.reachable)
    filtered.sort((a, b) => b.stratum.reserve - a.stratum.reserve)
    const rows = opts.top != null && opts.top > 0 ? filtered.slice(0, opts.top) : filtered

    const renderOpts: GatherableRenderOpts = {
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        entityName: state.entityName,
        coords: state.coords,
        projected: useProjected,
        locationType: view.locationType,
        locationTypeLabel: view.locationTypeLabel,
        size: view.size,
        caps: state.caps,
        budget: {energy: state.energy, cargoFreeKg: state.cargoFreeKg},
        energyCapacity: state.energyCapacity,
        cargoCapacityKg: state.cargoCapacityKg,
        quantity: opts.quantity,
        rows,
        totalStrata: view.strata.length,
        reachableTotal,
        showAll: Boolean(opts.all),
        top: opts.top,
    }

    if (opts.json) {
        console.log(JSON.stringify(gatherableToJsonShape(renderOpts), null, 2))
    } else {
        console.log(renderGatherableTable(renderOpts))
    }
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'gatherable',
    description:
        'Show what this entity can gather at its location, with time, energy, and max-quantity per resource',
    appliesTo: ['ship'],
    build: (ctx) =>
        new Command('gatherable')
            .description(
                'Show what this entity can gather at its current (or projected) location. For each reachable stratum, computes time and energy for `--quantity` (default 1), and the maximum quantity reachable in a single gather call given current energy and cargo space.'
            )
            .option(
                '--quantity <n>',
                'batch size used for the Time and Energy columns (default: 1)',
                parseUint32,
                1
            )
            .option(
                '--projected',
                'use the projected location, energy, and cargo after the current schedule'
            )
            .option(
                '--all',
                'include strata that are deeper than the gatherer can reach (marked OOD)'
            )
            .option('--top <n>', 'show only the top N strata by available reserve', parseUint32, 10)
            .option('--json', 'emit JSON with full strata + gather data instead of formatted text')
            .action(async (opts: GatherableOpts) => {
                await runGatherable(ctx, opts)
            }),
}
