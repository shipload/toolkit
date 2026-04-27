import {Box, createCliRenderer, Text} from '@opentui/core'
import type {Command} from 'commander'

export interface SelftestResult {
    ok: boolean
    message: string
}

export async function runSelftest(opts: {headless?: boolean} = {}): Promise<SelftestResult> {
    try {
        const renderer = await createCliRenderer({
            screenMode: opts.headless ? 'main-screen' : 'alternate-screen',
            exitOnCtrlC: false,
            exitSignals: [],
            useMouse: false,
            targetFps: 1,
        })
        try {
            renderer.root.add(
                Box({borderStyle: 'rounded', padding: 1}, Text({content: 'ok', fg: '#00FF00'}))
            )
        } finally {
            renderer.destroy()
        }
        return {ok: true, message: 'OpenTUI selftest ok'}
    } catch (err) {
        return {ok: false, message: `OpenTUI selftest failed: ${(err as Error).message}`}
    }
}

export function registerSubcommand(tools: Command): void {
    tools
        .command('__tui-selftest', {hidden: true})
        .description('Verify @opentui/core loads and paints (CI smoke test)')
        .action(async () => {
            const result = await runSelftest({headless: true})
            console.log(result.message)
            process.exit(result.ok ? 0 : 1)
        })
}
