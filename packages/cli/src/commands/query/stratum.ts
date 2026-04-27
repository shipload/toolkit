import {encodeStats, resolveItemCategory} from '@shipload/sdk'
import type {Command} from 'commander'
import {type EntityRef, parseEntityRef, parseInt64, parseUint32} from '../../lib/args'
import {server} from '../../lib/client'
import {formatItem, formatOutput, formatReserve, formatStats} from '../../lib/format'
import {loadLocationStrata} from '../../lib/location-loader'
import {renderStrata} from '../../lib/strata-render'

export interface StratumDetailData {
    stratum: any
    stats: any
    index: number
}

export function renderDetail(s: any, stats: any, index: number): string {
    const itemId = Number(s.item_id)
    const lines = [
        `Stratum [${index}]:`,
        `  Item:     ${formatItem(itemId)}`,
        `  Reserve:  ${formatReserve(Number(s.reserve), Number(s.reserve_max))}`,
        `  Richness: ${s.richness}`,
        `  Seed:     ${s.seed}`,
    ]
    if (stats) {
        const category = resolveItemCategory(itemId)
        const packed = encodeStats([Number(stats.stat1), Number(stats.stat2), Number(stats.stat3)])
        lines.push(`  Stats:    ${formatStats(packed, category ?? itemId)}`)
    }
    return lines.join('\n')
}

export interface StrataListOpts {
    entity?: EntityRef
    all?: boolean
    top?: number
    sort?: 'available' | 'index'
    json?: boolean
}

function registerSingular(program: Command): void {
    program
        .command('stratum')
        .description('Show detail for one stratum at a coordinate (use `strata` for the list).')
        .argument('<x>', 'x coordinate', parseInt64)
        .argument('<y>', 'y coordinate', parseInt64)
        .argument('<index>', 'stratum index', parseUint32)
        .option('--json', 'emit JSON instead of formatted text')
        .addHelpText('after', '\nFor a list of all strata at a location, use `strata <x> <y>`.')
        .action(async (x: bigint, y: bigint, index: number, opts: {json?: boolean}) => {
            const result = (await server.readonly('getstratum', {
                x,
                y,
                stratum: index,
            })) as {stratum: any; stats: any}
            const data: StratumDetailData = {
                stratum: result.stratum,
                stats: result.stats,
                index,
            }
            console.log(
                formatOutput(data, {json: Boolean(opts.json)}, (d) =>
                    renderDetail(d.stratum, d.stats, d.index)
                )
            )
        })
}

function registerList(program: Command): void {
    program
        .command('strata')
        .description(
            'List all non-empty strata at a coordinate. Reserves shown are remaining as of the current epoch.'
        )
        .argument('<x>', 'x coordinate', parseInt64)
        .argument('<y>', 'y coordinate', parseInt64)
        .option(
            '--entity <ref>',
            "filter and rank strata by what this entity's gatherer can reach (e.g. ship:1)",
            parseEntityRef
        )
        .option('--all', 'with --entity, also show strata that are out of reach (marked OOD)')
        .option(
            '--top <n>',
            'show only the top N strata by available reserve (default: all)',
            parseUint32
        )
        .option('--sort <mode>', "sort by 'available' (default) or 'index'", 'available')
        .option('--json', 'emit JSON with full strata data instead of formatted text')
        .addHelpText('after', '\nFor detail on a single stratum, use `stratum <x> <y> <index>`.')
        .action(async (x: bigint, y: bigint, opts: StrataListOpts) => {
            const view = await loadLocationStrata({x, y}, {entity: opts.entity})
            console.log(
                renderStrata(
                    {
                        ...view,
                        showAll: Boolean(opts.all),
                        top: opts.top,
                        sort: opts.sort ?? 'available',
                    },
                    Boolean(opts.json)
                )
            )
        })
}

export function register(program: Command): void {
    registerSingular(program)
    registerList(program)
}
