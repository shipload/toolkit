import {expect, test} from 'bun:test'
import type {CharterReadyResult, TickResult, VoteReadyResult} from '@shipload/oracle'
import {
    formatCharterReady,
    formatClean,
    formatMintReady,
    formatTend,
    formatDuration,
    formatTick,
    formatVoteReady,
    renderStatus,
    type OracleStatusView,
} from './format'

const base: OracleStatusView = {
    serverAccount: 'eon.shipload',
    stateInitialized: true,
    enabled: true,
    epoch: 1,
    gameStarted: true,
    epochClockSet: true,
    currentHeight: 1,
    target: 2,
    quorumDeployed: true,
    threshold: 2,
    oracles: [],
}

test('formatTick describes a fresh commit waiting on height', () => {
    const r: TickResult = {
        target: 42,
        currentHeight: 41,
        commit: 'posted',
        reveal: 'waiting-for-height',
    }
    const line = formatTick(r)
    expect(line).toContain('epoch 42')
    expect(line).toContain('commit: posted')
    expect(line).toContain('reveal: waiting-for-height')
    expect(line).toContain('h=41')
})

test('formatTick renders a boundary eta alongside the height', () => {
    const r: TickResult = {
        target: 17,
        currentHeight: 16,
        commit: 'already-committed',
        reveal: 'waiting-for-height',
        eta: {kind: 'boundary', seconds: 2460},
    }
    expect(formatTick(r)).toContain('(h=16, boundary in 41m)')
})

test('formatTick renders a finality eta in seconds', () => {
    const r: TickResult = {
        target: 17,
        currentHeight: 17,
        commit: 'already-committed',
        reveal: 'waiting-for-finality',
        eta: {kind: 'finality', seconds: 45},
    }
    expect(formatTick(r)).toContain('(h=17, finality in 45s)')
})

test('formatDuration rolls minutes into hours', () => {
    expect(formatDuration(30)).toBe('30s')
    expect(formatDuration(2460)).toBe('41m')
    expect(formatDuration(3600)).toBe('1h')
    expect(formatDuration(5400)).toBe('1h30m')
})

test('formatTick describes a posted reveal', () => {
    const r: TickResult = {
        target: 42,
        currentHeight: 42,
        commit: 'already-committed',
        reveal: 'posted',
    }
    expect(formatTick(r)).toContain('reveal: posted')
})

test('renderStatus on an uninitialized chain does not crash and shows the checklist', () => {
    const view: OracleStatusView = {
        ...base,
        stateInitialized: false,
        enabled: false,
        epoch: undefined,
        gameStarted: false,
        epochClockSet: false,
        currentHeight: undefined,
        target: undefined,
        threshold: 0,
        oracles: [],
    }
    const out = renderStatus(view)
    expect(out).toContain('state not initialized')
    expect(out).toMatch(/Game started:\s+unknown/)
    expect(out).toContain('not set (game not registered')
    expect(out).toMatch(/Threshold:\s+not set/)
    expect(out).toContain('No oracles registered.')
})

test('renderStatus shows pre-genesis when enabled but epoch 0', () => {
    const view: OracleStatusView = {
        ...base,
        epoch: 0,
        gameStarted: false,
        target: 1,
        oracles: [{handle: 'greymass', committed: true, revealed: false}],
    }
    const out = renderStatus(view)
    expect(out).toMatch(/Contract enabled:\s+yes/)
    expect(out).toContain('pre-genesis, epoch 0')
    expect(out).toMatch(/Target epoch:\s+1/)
    expect(out).toMatch(/greymass.*yes.*no/)
})

test('renderStatus shows the started game with quorum table', () => {
    const view: OracleStatusView = {
        ...base,
        epoch: 5,
        gameStarted: true,
        target: 6,
        oracles: [
            {handle: 'greymass', committed: true, revealed: true},
            {handle: 'aaron', committed: true, revealed: false},
        ],
    }
    const out = renderStatus(view)
    expect(out).toContain('yes (epoch 5)')
    expect(out).toMatch(/Epoch clock:\s+set \(height 1\)/)
    expect(out).toContain('greymass')
    expect(out).toContain('aaron')
})

test('renderStatus personal section shows pubkey, key-wired, registered, and marks you', () => {
    const view: OracleStatusView = {
        ...base,
        oracles: [{handle: 'greymass', committed: false, revealed: false}],
        mine: {
            handle: 'greymass',
            pubkey: 'PUB_K1_xyz',
            keyWired: true,
            registered: true,
            secretStored: false,
            storePath: '/tmp/g.sqlite',
        },
    }
    const out = renderStatus(view)
    expect(out).toMatch(/You:\s+greymass/)
    expect(out).toContain('PUB_K1_xyz')
    expect(out).toMatch(/Key wired:\s+yes/)
    expect(out).toMatch(/Registered:\s+yes/)
    expect(out).toContain('greymass (you)')
})

test('renderStatus flags an unwired, unregistered handle', () => {
    const view: OracleStatusView = {
        ...base,
        stateInitialized: false,
        enabled: false,
        epoch: undefined,
        gameStarted: false,
        epochClockSet: false,
        currentHeight: undefined,
        target: undefined,
        threshold: 0,
        oracles: [],
        mine: {
            handle: 'newbie',
            pubkey: 'PUB_K1_abc',
            keyWired: false,
            registered: false,
            secretStored: false,
            storePath: '/tmp/n.sqlite',
        },
    }
    const out = renderStatus(view)
    expect(out).toMatch(/Key wired:\s+no/)
    expect(out).toMatch(/Registered:\s+no/)
})

test('renderStatus shows state present but epoch clock not set (partial bring-up)', () => {
    const view: OracleStatusView = {
        ...base,
        epoch: 1,
        gameStarted: true,
        target: 2,
        epochClockSet: false,
        currentHeight: undefined,
        oracles: [{handle: 'greymass', committed: false, revealed: false}],
    }
    const out = renderStatus(view)
    expect(out).toContain('not set (game not registered')
    expect(out).toMatch(/Target epoch:\s+2/)
})

test('renderStatus renders Secret stored as — pre-init and yes when stored', () => {
    const preInit: OracleStatusView = {
        ...base,
        stateInitialized: false,
        epoch: undefined,
        target: undefined,
        threshold: 0,
        oracles: [],
        mine: {
            handle: 'g',
            pubkey: 'PUB_K1_x',
            keyWired: false,
            registered: false,
            secretStored: false,
            storePath: '/tmp/g.sqlite',
        },
    }
    expect(renderStatus(preInit)).toMatch(/Secret stored:\s+—/)

    const stored: OracleStatusView = {
        ...base,
        oracles: [{handle: 'g', committed: true, revealed: false}],
        mine: {
            handle: 'g',
            pubkey: 'PUB_K1_x',
            keyWired: true,
            registered: true,
            secretStored: true,
            storePath: '/tmp/g.sqlite',
        },
    }
    expect(renderStatus(stored)).toMatch(/Secret stored:\s+yes/)
})

test('renderStatus shows quorum-not-deployed when the oracles table is absent', () => {
    const view: OracleStatusView = {
        ...base,
        stateInitialized: false,
        enabled: false,
        epoch: undefined,
        gameStarted: false,
        epochClockSet: false,
        currentHeight: undefined,
        target: undefined,
        quorumDeployed: false,
        threshold: 0,
        oracles: [],
    }
    const out = renderStatus(view)
    expect(out).toContain('not deployed')
    expect(out).not.toContain('Threshold:')
    expect(out).not.toContain('No oracles registered.')
})

test('renderStatus still shows the personal block when the quorum is not deployed', () => {
    const view: OracleStatusView = {
        ...base,
        stateInitialized: false,
        enabled: false,
        epoch: undefined,
        gameStarted: false,
        epochClockSet: false,
        currentHeight: undefined,
        target: undefined,
        quorumDeployed: false,
        threshold: 0,
        oracles: [],
        mine: {
            handle: 'greymass',
            pubkey: 'PUB_K1_xyz',
            keyWired: true,
            registered: false,
            secretStored: false,
            storePath: '/tmp/g.sqlite',
        },
    }
    const out = renderStatus(view)
    expect(out).toContain('not deployed')
    expect(out).toMatch(/You:\s+greymass/)
    expect(out).toContain('PUB_K1_xyz')
    expect(out).toMatch(/Key wired:\s+yes/)
    expect(out).toMatch(/Registered:\s+no/)
})

test('formatTick renders the new reveal outcomes verbatim', () => {
    const waiting: TickResult = {
        target: 42,
        currentHeight: 42,
        commit: 'already-committed',
        reveal: 'waiting-for-commits',
    }
    expect(formatTick(waiting)).toContain('reveal: waiting-for-commits')
    const finality: TickResult = {
        target: 42,
        currentHeight: 42,
        commit: 'already-committed',
        reveal: 'waiting-for-finality',
    }
    expect(formatTick(finality)).toContain('reveal: waiting-for-finality')
})

test('formatClean describes a cleaned scope', () => {
    expect(formatClean({kind: 'cleaned', epoch: 7, rows: 40})).toContain('epoch 7')
    expect(formatClean({kind: 'cleaned', epoch: 7, rows: 40})).toContain('40')
})

test('formatClean describes an empty pass', () => {
    expect(formatClean({kind: 'nothing-to-clean'})).toMatch(/nothing/i)
})

test('mint sweep reports an idle pass', () => {
    expect(formatMintReady({kind: 'nothing-ready'})).toBe('mint sweep: nothing ready')
})

test('mint sweep reports a productive pass', () => {
    expect(formatMintReady({kind: 'minted', ready: 2})).toBe('mint sweep: 2 pool(s) ready')
})

test('formatCharterReady describes completed worlds', () => {
    const r: CharterReadyResult = {
        kind: 'completed',
        worlds: [
            {x: 1, y: 2},
            {x: 3, y: 4},
        ],
    }
    expect(formatCharterReady(r)).toContain('completed 2 world(s)')
})

test('formatCharterReady describes nothing buildable without inventing a count', () => {
    const r: CharterReadyResult = {kind: 'nothing-buildable', examined: 0}
    expect(formatCharterReady(r)).toBe('charter sweep: nothing buildable')
})

test('formatVoteReady describes a settled sweep', () => {
    const r: VoteReadyResult = {kind: 'settled', due: 3, maxBallots: 0}
    expect(formatVoteReady(r)).toContain('settled 3 due ballot(s)')
})

test('formatVoteReady describes none due without inventing a count', () => {
    const r: VoteReadyResult = {kind: 'none-due', pending: 0}
    expect(formatVoteReady(r)).toBe('ballot sweep: none due')
})

test('fund sweep reports an idle pass', () => {
    expect(formatTend({kind: 'nothing-tendable'})).toBe('fund sweep: nothing tendable')
})

test('fund sweep names the lots it tended', () => {
    expect(formatTend({kind: 'tended', assetIds: [11, 12]})).toBe('fund sweep: tended 2 lot(s)')
})
