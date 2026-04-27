import {categoryLabelFromIndex, formatTier} from '@shipload/sdk'
import type {Command} from 'commander'
import {server} from '../../lib/client'
import {formatItem, formatOutput} from '../../lib/format'

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
    if (raw) return JSON.stringify(input, null, 2)
    return renderPretty(input)
}

export function register(program: Command): void {
    program
        .command('resources')
        .description('List resource definitions')
        .option('--raw', 'emit raw JSON')
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (options: {raw?: boolean; json?: boolean}) => {
            const result = (await server.readonly('getresources', {})) as unknown as {
                resources: Resource[]
            }
            console.log(
                formatOutput(
                    result,
                    {json: Boolean(options.json) || Boolean(options.raw)},
                    renderPretty
                )
            )
        })
}
