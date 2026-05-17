import {Checksum256} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName, parseUint32} from '../../lib/args'
import {getGameSeed, server} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {formatNearby, type NearbySort} from '../../lib/format'
import {resolveReach} from '../../lib/reach'

const SORT_VALUES = new Set<NearbySort>(['distance', 'energy', 'time', 'reserve'])

function parseSort(v: string): NearbySort {
    if (!SORT_VALUES.has(v as NearbySort)) {
        throw new Error(`invalid sort '${v}', expected one of: distance, energy, time, reserve`)
    }
    return v as NearbySort
}

export interface NearbyOpts {
    entityType: EntityTypeName
    entityId: bigint
    recharge?: boolean
}

export function buildQuery(opts: NearbyOpts): {
    entity_id: bigint
    recharge: boolean
} {
    return {
        entity_id: opts.entityId,
        recharge: opts.recharge !== false,
    }
}

interface RunOptions {
    recharge: boolean
    expand?: boolean
    includeOod?: boolean
    sort: NearbySort
    top: number
    json?: boolean
}

export async function runNearby(ctx: EntityContext, options: RunOptions): Promise<void> {
    const [nearbyRaw, gameSeed, stateRaw, reach] = await Promise.all([
        server.readonly('getnearby', {
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
        formatNearby(nearby, {
            gameSeed,
            epochSeed,
            reach,
            expand: options.expand,
            includeOOD: options.includeOod,
            sort: options.sort,
            top: options.top,
            json: options.json,
        })
    )
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'nearby',
    description: 'Show nearby systems and what they hold, ranked by distance.',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('nearby')
            .description(
                'Show nearby systems and what they hold, ranked by distance. ' +
                    'Reserves shown are remaining for the current epoch.'
            )
            .option('--no-recharge', 'use current energy instead of projecting a recharge first')
            .option('--expand', 'list every reachable resource per system (one row each)')
            .option('--include-ood', 'with --expand, also list out-of-depth (OOD) resources')
            .option('--top <n>', 'show only the top N systems', parseUint32, 20)
            .option(
                '--sort <field>',
                'sort by distance | energy | time | reserve',
                parseSort,
                'distance' as NearbySort
            )
            .option('--json', 'emit JSON instead of formatted text')
            .action(async (opts: RunOptions) => {
                await runNearby(ctx, opts)
            }),
}
