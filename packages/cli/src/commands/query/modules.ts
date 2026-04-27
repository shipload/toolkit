import type {Command} from 'commander'
import {server} from '../../lib/client'
import {formatItem, formatOutput} from '../../lib/format'

interface Module {
    id: number
    mass: number
    module_type: number
    tier: number
}

export function renderPretty(input: {modules: Module[]}): string {
    const rows = input.modules ?? []
    const lines = [`Modules (${rows.length}):`]
    for (const m of rows) {
        lines.push(
            `  ${formatItem(m.id).padEnd(28)}  type ${m.module_type}  tier ${m.tier}  mass ${m.mass}`
        )
    }
    return lines.join('\n')
}

export function render(input: {modules: Module[]}, raw: boolean): string {
    if (raw) return JSON.stringify(input, null, 2)
    return renderPretty(input)
}

export function register(program: Command): void {
    program
        .command('modules')
        .description('List module definitions')
        .option('--raw', 'emit raw JSON')
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (options: {raw?: boolean; json?: boolean}) => {
            const result = (await server.readonly('getmodules', {})) as unknown as {
                modules: Module[]
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
