import type {Command} from 'commander'
import {getGameConfig, server} from '../../lib/client'
import {formatOutput} from '../../lib/format'

export interface EpochView {
    seed: string
    epoch: number
    started: Date
    epochTimeSeconds: number
    now: Date
}

export interface EpochJsonData {
    seed: string
    epoch: number
    started: string
    epoch_time_seconds: number
    elapsed_seconds: number
    remaining_seconds: number
    next_advance_at: string
}

function formatDuration(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds))
    const d = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    const parts: string[] = []
    if (d) parts.push(`${d}d`)
    if (h || d) parts.push(`${h}h`)
    if (m || h || d) parts.push(`${m}m`)
    parts.push(`${sec}s`)
    return parts.join(' ')
}

function buildJsonData(view: EpochView): EpochJsonData {
    const elapsed = Math.floor((view.now.getTime() - view.started.getTime()) / 1000)
    const remaining = view.epochTimeSeconds - elapsed
    const nextAt = new Date(view.started.getTime() + view.epochTimeSeconds * 1000)
    return {
        seed: view.seed,
        epoch: view.epoch,
        started: view.started.toISOString(),
        epoch_time_seconds: view.epochTimeSeconds,
        elapsed_seconds: elapsed,
        remaining_seconds: remaining,
        next_advance_at: nextAt.toISOString(),
    }
}

export function render(view: EpochView, raw: boolean): string {
    const data = buildJsonData(view)

    if (raw) {
        return JSON.stringify(data, null, 2)
    }

    return [
        `Epoch:         ${data.epoch}`,
        `Seed:          ${data.seed}`,
        `Started at:    ${data.started}`,
        `Duration:      ${data.epoch_time_seconds}s (${formatDuration(data.epoch_time_seconds)})`,
        `Elapsed:       ${formatDuration(data.elapsed_seconds)}`,
        `Remaining:     ${formatDuration(data.remaining_seconds)}`,
        `Next advance:  ${data.next_advance_at}`,
    ].join('\n')
}

export function register(program: Command): void {
    program
        .command('epoch')
        .description('Show current epoch seed and timing')
        .option('--raw', 'emit raw JSON')
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (options: {raw?: boolean; json?: boolean}) => {
            const state = (await server.table('state').get()) as unknown as {
                seed: {toString(): string}
                epoch: number | bigint
            } | null
            if (!state) throw new Error('Server state row not found')
            const {epochTimeSeconds, gameStart} = await getGameConfig()
            const epoch = Number(state.epoch)
            const started = new Date(gameStart.getTime() + (epoch - 1) * epochTimeSeconds * 1000)
            const view: EpochView = {
                seed: String(state.seed),
                epoch,
                started,
                epochTimeSeconds,
                now: new Date(),
            }
            if (options.json) {
                const data = buildJsonData(view)
                console.log(formatOutput(data, {json: true}, () => ''))
            } else {
                console.log(render(view, Boolean(options.raw)))
            }
        })
}
