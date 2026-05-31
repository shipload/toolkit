import type {Command} from 'commander'
import {client, getGameConfig, server} from '../../lib/client'
import {loadConfig} from '../../lib/config'
import {formatOutput, jsonStringify} from '../../lib/format'

export interface ContractCodeView {
    name: string
    lastCodeUpdate: Date
}

export interface EpochView {
    seed: string
    epoch: number
    calculatedEpoch?: number
    started: Date
    epochTimeSeconds: number
    now: Date
    threshold: number
    oracleCount: number
    activeEpoch?: number
    revealCount: number
    contracts: ContractCodeView[]
}

export interface EpochJsonData {
    seed: string
    epoch: number
    calculated_epoch?: number
    epoch_diverged?: boolean
    started: string
    epoch_time_seconds: number
    elapsed_seconds: number
    remaining_seconds: number
    next_epoch_at: string
    threshold: number
    oracle_count: number
    active_epoch?: number
    reveal_count: number
    contracts: {name: string; last_code_update: string}[]
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

function calculateCurrentEpoch(gameStart: Date, epochTimeSeconds: number, now: Date): number {
    return Math.floor((now.getTime() - gameStart.getTime()) / (epochTimeSeconds * 1000)) + 1
}

function buildJsonData(view: EpochView): EpochJsonData {
    const elapsed = Math.floor((view.now.getTime() - view.started.getTime()) / 1000)
    const remaining = view.epochTimeSeconds - elapsed
    const nextAt = new Date(view.started.getTime() + view.epochTimeSeconds * 1000)
    const data: EpochJsonData = {
        seed: view.seed,
        epoch: view.epoch,
        started: view.started.toISOString(),
        epoch_time_seconds: view.epochTimeSeconds,
        elapsed_seconds: elapsed,
        remaining_seconds: remaining,
        next_epoch_at: nextAt.toISOString(),
        threshold: view.threshold,
        oracle_count: view.oracleCount,
        reveal_count: view.revealCount,
        contracts: view.contracts.map((c) => ({
            name: c.name,
            last_code_update: c.lastCodeUpdate.toISOString(),
        })),
    }
    if (view.activeEpoch !== undefined) {
        data.active_epoch = view.activeEpoch
    }
    if (view.calculatedEpoch !== undefined) {
        data.calculated_epoch = view.calculatedEpoch
        data.epoch_diverged = view.calculatedEpoch !== view.epoch
    }
    return data
}

export function render(view: EpochView, raw: boolean): string {
    const data = buildJsonData(view)

    if (raw) {
        return jsonStringify(data)
    }

    const lines = [
        `Epoch:         ${data.epoch}`,
        `Seed:          ${data.seed}`,
        `Started at:    ${data.started}`,
        `Duration:      ${data.epoch_time_seconds}s (${formatDuration(data.epoch_time_seconds)})`,
        `Elapsed:       ${formatDuration(data.elapsed_seconds)}`,
        `Remaining:     ${formatDuration(data.remaining_seconds)}`,
        `Next epoch:    ${data.next_epoch_at}`,
        `Quorum:        ${data.reveal_count}/${data.threshold} reveals (${data.oracle_count} oracles registered)${
            data.active_epoch !== undefined ? ` for epoch ${data.active_epoch}` : ''
        }`,
    ]
    if (data.epoch_diverged) {
        lines.splice(
            1,
            0,
            `WARNING: on-chain epoch ${data.epoch} differs from wall-clock epoch ${data.calculated_epoch}.`
        )
    }
    const labelWidth = Math.max(15, ...data.contracts.map((c) => c.name.length + 7))
    for (const c of data.contracts) {
        lines.push(`${`${c.name} code:`.padEnd(labelWidth)}${c.last_code_update}`)
    }
    return lines.join('\n')
}

export function register(program: Command): void {
    program
        .command('epoch')
        .description('Show current epoch seed and timing')
        .option('--raw', 'emit raw JSON')
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (options: {raw?: boolean; json?: boolean}) => {
            const cfg = loadConfig()
            const [stateRow, gameConfig, gameAccount, platformAccount, oracleCfg, oracleRows] =
                await Promise.all([
                    server.table('state').get(),
                    getGameConfig(),
                    client.v1.chain.get_account(cfg.gameContract),
                    client.v1.chain.get_account(cfg.platformContract),
                    server.table('oraclecfg').get(),
                    server.table('oracles').all(),
                ])
            if (!stateRow) throw new Error('Server state row not found')
            const {epochTimeSeconds, gameStart} = gameConfig
            const epoch = Number(stateRow.epoch)
            const now = new Date()
            const calculatedEpoch = calculateCurrentEpoch(gameStart, epochTimeSeconds, now)
            const started = new Date(gameStart.getTime() + (epoch - 1) * epochTimeSeconds * 1000)
            const activeEpoch = epoch + 1
            const revealRows = await server.table('reveal').all()
            const revealCount = revealRows.filter((r) => Number(r.epoch) === activeEpoch).length
            const view: EpochView = {
                seed: String(stateRow.seed),
                epoch,
                calculatedEpoch,
                started,
                epochTimeSeconds,
                now,
                threshold: oracleCfg ? Number(oracleCfg.threshold) : 0,
                oracleCount: oracleRows.length,
                activeEpoch,
                revealCount,
                contracts: [
                    {name: cfg.gameContract, lastCodeUpdate: gameAccount.last_code_update.toDate()},
                    {
                        name: cfg.platformContract,
                        lastCodeUpdate: platformAccount.last_code_update.toDate(),
                    },
                ],
            }
            if (options.json) {
                const data = buildJsonData(view)
                console.log(formatOutput(data, {json: true}, () => ''))
            } else {
                console.log(render(view, Boolean(options.raw)))
            }
        })
}
