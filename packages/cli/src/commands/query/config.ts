import type {Command} from 'commander'
import {server} from '../../lib/client'
import {formatOutput} from '../../lib/format'

function formatValue(v: unknown): string {
    if (v === null || v === undefined) return ''
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
}

export function renderPretty(config: unknown): string {
    const entries = Object.entries(config as Record<string, unknown>)
    return entries.map(([k, v]) => `${k.padEnd(20)} ${formatValue(v)}`).join('\n')
}

export function render(config: unknown, raw: boolean): string {
    if (raw) return JSON.stringify(config, null, 2)
    return renderPretty(config)
}

export function register(program: Command): void {
    program
        .command('config')
        .description('Show server game config')
        .option('--raw', 'emit raw JSON')
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (options: {raw?: boolean; json?: boolean}) => {
            const config = await server.readonly('getconfig', {})
            console.log(
                formatOutput(
                    config,
                    {json: Boolean(options.json) || Boolean(options.raw)},
                    renderPretty
                )
            )
        })
}
