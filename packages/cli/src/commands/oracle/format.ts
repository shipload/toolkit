import type {
    CharterReadyResult,
    CleanResult,
    CollectResult,
    MintReadyResult,
    TendResult,
    TickResult,
    VoteReadyResult,
} from '@shipload/oracle'
import Table from 'cli-table3'

export interface OracleRow {
    handle: string
    committed: boolean
    revealed: boolean
}

export type AdmissionState = 'admitted' | 'no-permission' | 'key-not-wired' | 'unreachable'

export interface OraclePersonal {
    handle: string
    pubkey: string
    keyWired: boolean
    registered: boolean
    secretStored: boolean
    storePath: string
    responsible?: {epoch: number; secondsAway: number}
}

export interface OracleStatusView {
    serverAccount: string
    stateInitialized: boolean
    enabled: boolean
    epoch?: number
    gameStarted: boolean
    epochClockSet: boolean
    currentHeight?: number
    target?: number
    quorumDeployed: boolean
    threshold: number
    oracles: OracleRow[]
    mine?: OraclePersonal
}

export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest === 0 ? `${hours}h` : `${hours}h${rest}m`
}

function raceLines(r: TickResult): string[] | null {
    if (r.commit === 'window-closed') {
        return [
            'A reveal for this epoch landed before your commit, so the commit window is',
            'shut. Your beacon commits again for the next epoch.',
        ]
    }
    if (r.commit === 'epoch-closed') {
        return [
            'The epoch finalized before your commit landed. Your beacon commits for the',
            'next epoch on the next pass.',
        ]
    }
    if (r.reveal === 'epoch-finalized') {
        return [
            'The seed was composed before your reveal landed. Only the fastest reveals up to',
            'the threshold count, so this is an ordinary outcome.',
        ]
    }
    if (r.close === 'raced') {
        return ['Another oracle closed this epoch first.']
    }
    return null
}

export function raceNote(r: TickResult): string | null {
    const lines = raceLines(r)
    return lines ? lines.join('\n  ') : null
}

export function formatTick(r: TickResult): string {
    const detail = r.eta
        ? `h=${r.currentHeight}, ${r.eta.kind} in ${formatDuration(r.eta.seconds)}`
        : `h=${r.currentHeight}`
    const close = r.close === 'not-due' ? '' : ` · close: ${r.close}`
    const line = `epoch ${r.target} · commit: ${r.commit} · reveal: ${r.reveal}${close} (${detail})`
    const note = raceNote(r)
    return note ? `${line}\n  ${note}` : line
}

export function formatClean(r: CleanResult): string {
    if (r.kind === 'cleaned') {
        return `reserve cleanup: epoch ${r.epoch} (${r.rows} rows)`
    }
    return 'reserve cleanup: nothing to clean'
}

export function formatMintReady(r: MintReadyResult): string {
    if (r.kind === 'minted') {
        return `mint sweep: ${r.ready} pool(s) ready`
    }
    return 'mint sweep: nothing ready'
}

export function formatCharterReady(r: CharterReadyResult): string {
    if (r.kind === 'completed') {
        return `charter sweep: completed ${r.worlds.length} world(s)`
    }
    return 'charter sweep: nothing buildable'
}

export function formatVoteReady(r: VoteReadyResult): string {
    if (r.kind === 'settled') {
        return `ballot sweep: settled ${r.due} due ballot(s) (max ${r.maxPages})`
    }
    return 'ballot sweep: none due'
}

export function formatCollect(r: CollectResult): string {
    if (r.kind === 'nothing-collectable') return 'fund collect: nothing collectable'
    const source = r.source === 'platform' ? 'platform balance' : 'market fees'
    return `fund collect: pulled ${source}`
}

export function formatTend(r: TendResult): string {
    if (r.kind === 'tended') {
        return `fund sweep: tended ${r.assetIds.length} lot(s)`
    }
    return 'fund sweep: nothing tendable'
}

function formatThreshold(view: OracleStatusView): string {
    if (view.threshold <= 0) return 'not set'
    return `${view.threshold} of ${view.oracles.length} (the fastest ${view.threshold} reveals compose the seed; later reveals bounce)`
}

function yn(v: boolean): string {
    return v ? 'yes' : 'no'
}

export function formatWaiting(opts: {
    handle: string
    actor: string
    permission: string
    state: AdmissionState
    detail?: string
}): string {
    const perm = `${opts.actor}@${opts.permission}`
    if (opts.state === 'unreachable') {
        return [
            `oracle ${opts.handle} waiting: cannot reach the chain.`,
            `  ${opts.detail ?? 'the node did not answer'}. Nothing is signed until it answers.`,
        ].join('\n')
    }
    if (opts.state === 'key-not-wired') {
        return [
            `oracle ${opts.handle} waiting: handle not admitted yet.`,
            `  ${perm} exists, but your oracle key is not wired to it.`,
            '  Nothing to do until the deployer wires it.',
        ].join('\n')
    }
    return [
        `oracle ${opts.handle} waiting: handle not admitted yet.`,
        `  The deployer has not created ${perm} or added it to the`,
        '  oracle registry. Nothing to do until they do.',
    ].join('\n')
}

export function formatWaitingBrief(opts: {
    handle: string
    state: AdmissionState
    waitingFor?: number
}): string {
    if (opts.waitingFor !== undefined) {
        return `oracle ${opts.handle} still waiting (${formatDuration(opts.waitingFor)}).`
    }
    if (opts.state === 'unreachable') {
        return `oracle ${opts.handle} waiting: cannot reach the chain.`
    }
    return `oracle ${opts.handle} waiting: handle not admitted yet.`
}

export function formatAdmitted(opts: {
    handle: string
    registered: boolean
    target: number
    responsible: number
    secondsAway: number
}): string {
    const head = `oracle ${opts.handle} admitted: key wired, ${
        opts.registered ? 'registered' : 'not in the oracle registry yet'
    }.`
    if (opts.responsible <= opts.target) {
        return `${head}\n  You are responsible from epoch ${opts.responsible}, the epoch under way now.`
    }
    return [
        head,
        `  Epoch ${opts.target} is already under way with a fixed oracle set that does not`,
        `  include you. You are responsible from epoch ${opts.responsible}, about ${formatDuration(
            opts.secondsAway
        )} away.`,
    ].join('\n')
}

export function operatorStatus(mine: OraclePersonal): string {
    if (!mine.keyWired) return 'waiting for the deployer to admit this handle'
    if (!mine.registered) return 'key wired, waiting to be added to the oracle registry'
    if (mine.responsible && mine.responsible.secondsAway > 0) {
        return `active from epoch ${mine.responsible.epoch}, about ${formatDuration(
            mine.responsible.secondsAway
        )} away`
    }
    return 'active'
}

export function renderStatus(view: OracleStatusView): string {
    const gameStartedLabel = !view.stateInitialized
        ? 'unknown (state not initialized)'
        : view.gameStarted
          ? `yes (epoch ${view.epoch})`
          : `no (pre-genesis, epoch ${view.epoch})`
    const lines = [
        `Server contract:   ${view.serverAccount}`,
        `Contract enabled:  ${view.stateInitialized ? yn(view.enabled) : 'no (state not initialized)'}`,
        `Game started:      ${gameStartedLabel}`,
        `Epoch clock:       ${view.epochClockSet ? `set (height ${view.currentHeight})` : 'not set (game not registered on platform)'}`,
        `Target epoch:      ${view.target !== undefined ? view.target : '—'}`,
    ]
    if (!view.quorumDeployed) {
        lines.push(`Oracle quorum:     not deployed (no oracles table on ${view.serverAccount})`)
    } else {
        lines.push(
            `Threshold:         ${formatThreshold(view)}`,
            `Oracles:           ${view.oracles.length} registered`
        )
    }
    if (view.mine) {
        lines.push(
            '',
            `You:               ${view.mine.handle}`,
            `  Public key:      ${view.mine.pubkey}`,
            `  Key wired:       ${yn(view.mine.keyWired)}`,
            `  Registered:      ${yn(view.mine.registered)}`,
            `  Status:          ${operatorStatus(view.mine)}`,
            `  Secret stored:   ${view.target !== undefined ? yn(view.mine.secretStored) : '—'}`,
            `  Store path:      ${view.mine.storePath}`
        )
    }
    if (!view.quorumDeployed) {
        return lines.join('\n')
    }
    if (view.oracles.length === 0) {
        lines.push('', 'No oracles registered.')
        return lines.join('\n')
    }
    const table = new Table({
        head: ['Oracle', 'Committed', 'Revealed'],
        chars: {
            top: '',
            'top-mid': '',
            'top-left': '',
            'top-right': '',
            bottom: '',
            'bottom-mid': '',
            'bottom-left': '',
            'bottom-right': '',
            left: '',
            'left-mid': '',
            mid: '',
            'mid-mid': '',
            right: '',
            'right-mid': '',
            middle: '  ',
        },
        style: {head: [], border: [], 'padding-left': 0, 'padding-right': 0},
    })
    for (const o of view.oracles) {
        const handle = view.mine && o.handle === view.mine.handle ? `${o.handle} (you)` : o.handle
        table.push([handle, yn(o.committed), yn(o.revealed)])
    }
    lines.push('', table.toString())
    return lines.join('\n')
}
