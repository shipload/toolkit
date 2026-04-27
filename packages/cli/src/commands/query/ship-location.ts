import {
    type ProjectableSnapshot,
    type ProjectedEntity,
    projectFromCurrentState,
} from '@shipload/sdk'
import {Command} from 'commander'
import {parseUint32} from '../../lib/args'
import {server} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {loadLocationStrata} from '../../lib/location-loader'
import {resolveReach} from '../../lib/reach'
import {renderStrata, strataToJsonShape} from '../../lib/strata-render'

interface ShipLocationOpts {
    projected?: boolean
    all?: boolean
    top?: number
    json?: boolean
}

async function getShipCoords(
    ctx: EntityContext,
    useProjected: boolean
): Promise<{x: bigint; y: bigint}> {
    // biome-ignore lint/suspicious/noExplicitAny: getentity readonly return is dynamic
    const info = (await server.readonly('getentity', {
        entity_type: ctx.entityType,
        entity_id: ctx.entityId,
    })) as any

    if (useProjected && info.schedule && info.schedule.tasks?.length > 0) {
        try {
            const projection: ProjectedEntity = projectFromCurrentState(info as ProjectableSnapshot)
            return {
                x: BigInt(projection.location.x.toString()),
                y: BigInt(projection.location.y.toString()),
            }
        } catch {
            // fall through to current
        }
    }
    return {
        x: BigInt(info.coordinates.x.toString()),
        y: BigInt(info.coordinates.y.toString()),
    }
}

async function runShipLocation(ctx: EntityContext, opts: ShipLocationOpts): Promise<void> {
    const useProjected = Boolean(opts.projected)

    const [coords, reach] = await Promise.all([
        getShipCoords(ctx, useProjected),
        resolveReach({entityType: ctx.entityType, entityId: ctx.entityId})
            .then((r) => ({depth: r.gatherer.depth}))
            .catch(() => undefined),
    ])

    const view = await loadLocationStrata(coords)
    const renderOpts = {
        ...view,
        reach,
        showAll: Boolean(opts.all),
        top: opts.top,
        sort: 'available' as const,
    }

    if (opts.json) {
        console.log(
            JSON.stringify(
                {
                    entity: {type: ctx.entityType, id: Number(ctx.entityId)},
                    projected: useProjected,
                    ...(strataToJsonShape(renderOpts) as Record<string, unknown>),
                },
                null,
                2
            )
        )
    } else {
        console.log(
            `${ctx.entityType} ${ctx.entityId} ${useProjected ? 'projected' : 'current'} location`
        )
        console.log(renderStrata(renderOpts, false))
    }
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'location',
    description: "Show resource summary for the entity's current (or projected) location",
    appliesTo: ['ship'],
    build: (ctx) =>
        new Command('location')
            .description("Show resource summary for the entity's current (or projected) location")
            .option('--projected', "use the entity's projected location after its current schedule")
            .option(
                '--all',
                "include strata that are out of the entity's gatherer reach (marked OOD)"
            )
            .option('--top <n>', 'show only the top N strata by available reserve', parseUint32, 10)
            .option('--json', 'emit JSON with full strata data instead of formatted text')
            .action(async (opts: ShipLocationOpts) => {
                await runShipLocation(ctx, opts)
            }),
}
