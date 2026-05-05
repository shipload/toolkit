import {findNearbyPlanets, PRECISION} from '@shipload/sdk'
import {Checksum256} from '@wharfkit/antelope'
import {Command} from 'commander'
import {type EntityRef, parseEntityRef, parseUint32} from '../../lib/args'
import {getGameSeed, server} from '../../lib/client'
import type {CoordContext, CoordSubcommand} from '../../lib/coord-scope'
import {jsonStringify} from '../../lib/format'
import {buildLocationSummary, type LocationSummary} from '../../lib/location-summary'
import {
    formatLocationSummaryTable,
    type LocationColumn,
    summariesToJson,
} from '../../lib/location-summary-table'
import {resolveReach} from '../../lib/reach'

type Sort = 'distance' | 'reserve'

const SORT_VALUES = new Set<Sort>(['distance', 'reserve'])

function parseSort(v: string): Sort {
    if (!SORT_VALUES.has(v as Sort)) {
        throw new Error(`invalid sort '${v}', expected one of: distance, reserve`)
    }
    return v as Sort
}

interface RunOptions {
    radius: number
    entity?: EntityRef
    expand?: boolean
    includeOod?: boolean
    sort: Sort
    top: number
    json?: boolean
}

const COLUMNS_BASE: LocationColumn[] = [
    'coords',
    'type',
    'subtype',
    'size',
    'distance',
    'resource',
    'depth',
    'reserve',
    'stats',
]

async function run(ctx: CoordContext, opts: RunOptions): Promise<void> {
    const [gameSeed, stateRaw, reach] = await Promise.all([
        getGameSeed(),
        server.table('state').get(),
        opts.entity
            ? resolveReach(opts.entity)
                  .then((r) => ({depth: r.gatherer.depth}))
                  .catch(() => undefined)
            : Promise.resolve(undefined),
    ])
    // biome-ignore lint/suspicious/noExplicitAny: state row shape
    const state = stateRaw as any
    const epochSeed = state?.seed ? Checksum256.from(state.seed) : undefined

    const origin = {x: Number(ctx.x), y: Number(ctx.y)}
    const planets = findNearbyPlanets(gameSeed, origin, opts.radius * PRECISION)

    const summaries: LocationSummary[] = planets.map((p) => {
        const coord = {x: Number(p.destination.x), y: Number(p.destination.y)}
        const distance = Number(p.distance) / PRECISION
        return buildLocationSummary(
            coord,
            {gameSeed, epochSeed, reach, includeOOD: opts.includeOod},
            {distance: Math.round(distance * 10) / 10}
        )
    })

    summaries.sort((a, b) => {
        if (opts.sort === 'reserve') {
            const ar = a.resources[0]?.reserve ?? 0
            const br = b.resources[0]?.reserve ?? 0
            return br - ar
        }
        return (a.distance ?? 0) - (b.distance ?? 0)
    })
    const limited = opts.top > 0 ? summaries.slice(0, opts.top) : summaries

    if (opts.json) {
        console.log(
            jsonStringify({
                origin: {x: Number(ctx.x), y: Number(ctx.y)},
                radius: opts.radius,
                total: summaries.length,
                shown: limited.length,
                sort: opts.sort,
                reach,
                systems: summariesToJson(limited),
            })
        )
        return
    }

    const columns = reach ? [...COLUMNS_BASE, 'reach' as LocationColumn] : COLUMNS_BASE
    const lines = [
        `Origin: (${ctx.x}, ${ctx.y})  radius ${opts.radius}`,
        `Nearby (${limited.length}${limited.length < summaries.length ? ` of ${summaries.length}` : ''}, sorted by ${opts.sort}):`,
    ]
    if (limited.length > 0) {
        lines.push(
            formatLocationSummaryTable(limited, {
                columns,
                expand: Boolean(opts.expand),
            })
        )
    } else {
        lines.push('  (no systems within radius)')
    }
    if (reach) {
        lines.push('')
        lines.push(
            opts.includeOod
                ? `Reachable: non-empty strata at depth ≤ gatherer (${reach.depth}) / total non-empty strata. Includes out-of-depth (OOD) strata.`
                : `Reachable: non-empty strata at depth ≤ gatherer (${reach.depth}) / total non-empty strata.`
        )
    }
    console.log(lines.join('\n'))
}

export const SUBCOMMAND: CoordSubcommand = {
    name: 'nearby',
    description: 'Show nearby systems and what they hold within a radius.',
    build: (ctx) =>
        new Command('nearby')
            .description(
                'Show nearby systems and what they hold within a radius. ' +
                    'Reserves shown are derived; pass --entity to filter by gatherer depth.'
            )
            .option('--radius <n>', 'search radius in grid units', parseUint32, 10)
            .option(
                '--entity <ref>',
                "filter resources by this entity's gatherer depth (e.g. ship:1)",
                parseEntityRef
            )
            .option('--expand', 'list every reachable resource per system (one row each)')
            .option('--include-ood', 'with --expand, also list out-of-depth (OOD) resources')
            .option('--top <n>', 'show only the top N systems', parseUint32, 20)
            .option('--sort <field>', 'sort by distance | reserve', parseSort, 'distance' as Sort)
            .option('--json', 'emit JSON instead of formatted text')
            .action(async (opts: RunOptions) => {
                await run(ctx, opts)
            }),
}
