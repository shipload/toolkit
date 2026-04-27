import {Checksum256} from '@wharfkit/antelope'
import {Command} from 'commander'
import type {EntityTypeName} from '../../lib/args'
import {getGameSeed, server} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {formatNearby, formatOutput} from '../../lib/format'
import {resolveReach} from '../../lib/reach'

export interface NearbyOpts {
    entityType: EntityTypeName
    entityId: bigint
    recharge?: boolean
}

export function buildQuery(opts: NearbyOpts): {
    entity_type: string
    entity_id: bigint
    recharge: boolean
} {
    return {
        entity_type: opts.entityType,
        entity_id: opts.entityId,
        recharge: opts.recharge !== false,
    }
}

export async function runNearby(
    ctx: EntityContext,
    options: {recharge: boolean; all?: boolean; json?: boolean}
): Promise<void> {
    const [nearbyRaw, gameSeed, stateRaw, reach] = await Promise.all([
        server.readonly('getnearby', {
            entity_type: ctx.entityType,
            entity_id: ctx.entityId,
            recharge: options.recharge !== false,
        }),
        getGameSeed(),
        server.table('state').get(),
        resolveReach({entityType: ctx.entityType, entityId: ctx.entityId})
            .then((r) => ({depth: r.gatherer.depth}))
            .catch(() => undefined),
    ])
    // biome-ignore lint/suspicious/noExplicitAny: getnearby readonly return shape
    const nearby = nearbyRaw as any
    // biome-ignore lint/suspicious/noExplicitAny: state row shape
    const state = stateRaw as any
    const epochSeed = state?.seed ? Checksum256.from(state.seed) : undefined

    console.log(
        formatOutput(nearby, {json: Boolean(options.json)}, (d) =>
            formatNearby(d, {
                gameSeed,
                epochSeed,
                reach,
                showAll: Boolean(options.all),
            })
        )
    )
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'nearby',
    description: 'Show nearby systems reachable from an entity',
    appliesTo: ['ship'],
    build: (ctx) =>
        new Command('nearby')
            .description('Show nearby systems reachable from an entity')
            .option('--no-recharge', 'disable recharge projection')
            .option('--all', 'expand each cell to list every resource (bypasses depth filter)')
            .option('--json', 'emit JSON instead of formatted text')
            .action(async (opts: {recharge: boolean; all?: boolean; json?: boolean}) => {
                await runNearby(ctx, opts)
            }),
}
