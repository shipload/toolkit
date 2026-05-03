import {categoryLabelFromIndex, formatTier} from '@shipload/sdk'
import type {Command} from 'commander'
import {parseInt64} from '../../lib/args'
import {server} from '../../lib/client'
import {formatItem, formatOutput, jsonStringify} from '../../lib/format'
import {loadLocationStrata} from '../../lib/location-loader'
import {renderStrata} from '../../lib/strata-render'

interface Resource {
    id: number
    mass: number
    category: number
    tier: number
}

export function renderPretty(input: {resources: Resource[]}): string {
    const rows = input.resources ?? []
    const lines = [`Resources (${rows.length}):`]
    for (const r of rows) {
        const label = `${categoryLabelFromIndex(r.category)} · ${formatTier(r.tier)}`
        lines.push(`  ${formatItem(r.id).padEnd(28)}  ${label.padEnd(18)}  mass ${r.mass}`)
    }
    return lines.join('\n')
}

export function render(input: {resources: Resource[]}, raw: boolean): string {
    if (raw) return jsonStringify(input)
    return renderPretty(input)
}

export function register(program: Command): void {
    program
        .command('resources')
        .description('List resource definitions, or strata at a coordinate.')
        .argument('[x]', 'optional x coordinate', parseInt64)
        .argument('[y]', 'optional y coordinate', parseInt64)
        .option('--raw', 'emit raw JSON')
        .option('--json', 'emit JSON instead of formatted text')
        .addHelpText(
            'after',
            '\nWith no args: lists every resource definition.\n' +
                'With <x> <y>: same as `strata <x> <y>` (use `strata` for filtering).'
        )
        .action(
            async (
                x: bigint | undefined,
                y: bigint | undefined,
                options: {raw?: boolean; json?: boolean}
            ) => {
                const asJson = Boolean(options.json) || Boolean(options.raw)
                if ((x === undefined) !== (y === undefined)) {
                    console.error('resources: provide both <x> and <y>, or neither')
                    process.exitCode = 1
                    return
                }
                if (x !== undefined && y !== undefined) {
                    const view = await loadLocationStrata({x, y})
                    console.log(renderStrata({...view, sort: 'available'}, asJson))
                    return
                }
                const result = (await server.readonly('getresources', {})) as unknown as {
                    resources: Resource[]
                }
                console.log(formatOutput(result, {json: asJson}, renderPretty))
            }
        )
}
