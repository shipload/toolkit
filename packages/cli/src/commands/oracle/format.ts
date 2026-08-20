import type {
    CharterReadyResult,
    CleanResult,
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

export interface OraclePersonal {
    handle: string
    pubkey: string
    keyWired: boolean
    registered: boolean
    secretStored: boolean
    storePath: string
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

export function formatTick(r: TickResult): string {
    return `epoch ${r.target} · commit: ${r.commit} · reveal: ${r.reveal} (h=${r.currentHeight})`
}

export function formatClean(r: CleanResult): string {
    if (r.kind === 'cleaned') {
        return `reserve cleanup: epoch ${r.epoch} (${r.rows} rows)`
    }
    return 'reserve cleanup: nothing to clean'
}

export function formatMintReady(r: MintReadyResult): string {
    return `mint sweep: poked (max ${r.maxMints ?? 'default'})`
}

export function formatCharterReady(r: CharterReadyResult): string {
    if (r.kind === 'completed') {
        return `charter sweep: completed ${r.worlds.length} world(s)`
    }
    return `charter sweep: nothing buildable (${r.examined} examined)`
}

export function formatVoteReady(r: VoteReadyResult): string {
    if (r.kind === 'settled') {
        return `ballot sweep: settled ${r.due} due ballot(s) (max ${r.maxBallots})`
    }
    if (r.kind === 'none-due') {
        return `ballot sweep: none due (${r.pending} pending)`
    }
    return 'ballot sweep: no ballots queued'
}

export function formatTend(r: TendResult): string {
    if (r.kind === 'tended') {
        return `fund sweep: tended (max ${r.maxLots})`
    }
    return 'fund sweep: no lots to tend'
}

function yn(v: boolean): string {
    return v ? 'yes' : 'no'
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
            `Threshold:         ${view.threshold > 0 ? view.threshold : 'not set'}`,
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
