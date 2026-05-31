import {expect, test} from 'bun:test'
import {Checksum256, Name, UInt64} from '@wharfkit/antelope'
import {runOnce, type OracleDeps} from './run-once'

const ORACLE = Name.from('greymass')
const REVEAL = Checksum256.from('a'.repeat(64))
const COMMIT = Checksum256.from('b'.repeat(64))

function fakeDeps(opts: {
    finalized: number
    height: number
    committedBy?: Name[]
    revealedBy?: Name[]
    secret?: Checksum256
    threshold?: number
    commitBlock?: number
    headBlock?: number
    libBlock?: number
    postBlock?: number
}): {
    deps: OracleDeps
    sent: string[]
    calls: {kind: string; oracle: string; epoch: number; hash: string}[]
    recorded: Map<number, number>
} {
    const sent: string[] = []
    const calls: {kind: string; oracle: string; epoch: number; hash: string}[] = []
    const recorded = new Map<number, number>()
    const commits = (opts.committedBy ?? []).map((o) => ({oracle_id: o}))
    const reveals = (opts.revealedBy ?? []).map((o) => ({oracle_id: o}))
    const headBlock = opts.headBlock ?? 100
    const libBlock = opts.libBlock ?? 100
    const deps: OracleDeps = {
        epochs: {
            getFinalizedEpoch: async () => UInt64.from(opts.finalized),
            getCurrentHeight: async () => UInt64.from(opts.height),
            getCommitsFor: async () => commits,
            getRevealsFor: async () => reveals,
            getEpochThreshold: async () => opts.threshold ?? 1,
            getChainInfo: async () => ({headBlock, libBlock}),
        },
        actions: {
            commit: (oracle, epoch, hash) => {
                calls.push({kind: 'commit', oracle: String(oracle), epoch, hash: String(hash)})
                return {name: 'commit'} as never
            },
            reveal: (oracle, epoch, hash) => {
                calls.push({kind: 'reveal', oracle: String(oracle), epoch, hash: String(hash)})
                return {name: 'reveal'} as never
            },
        },
        session: {
            transact: async ({action}) => {
                sent.push((action as unknown as {name: string}).name)
                return {block_num: opts.postBlock ?? 100}
            },
        },
        oracleId: ORACLE,
        store: {
            getOrCreate: () => ({commit: COMMIT, reveal: REVEAL}),
            getReveal: () => opts.secret,
            getCommitBlock: () => opts.commitBlock,
            recordCommitBlock: (epoch, block) => {
                recorded.set(epoch, block)
            },
        },
    }
    return {deps, sent, calls, recorded}
}

test('fresh epoch below height: commit posted, reveal waits for height', async () => {
    const {deps, sent} = fakeDeps({finalized: 41, height: 41})
    const r = await runOnce(deps)
    expect(r.target).toBe(42)
    expect(r.commit).toBe('posted')
    expect(r.reveal).toBe('waiting-for-height')
    expect(sent).toEqual(['commit'])
})

test('fresh epoch at height: commit posted, reveal defers to next tick', async () => {
    const {deps, sent} = fakeDeps({finalized: 41, height: 42})
    const r = await runOnce(deps)
    expect(r.commit).toBe('posted')
    expect(r.reveal).toBe('just-committed')
    expect(sent).toEqual(['commit'])
})

test('already committed at height: reveal posted', async () => {
    const {deps, sent} = fakeDeps({
        finalized: 41,
        height: 42,
        committedBy: [ORACLE],
        secret: REVEAL,
    })
    const r = await runOnce(deps)
    expect(r.commit).toBe('already-committed')
    expect(r.reveal).toBe('posted')
    expect(sent).toEqual(['reveal'])
})

test('already committed and revealed: nothing sent', async () => {
    const {deps, sent} = fakeDeps({
        finalized: 41,
        height: 42,
        committedBy: [ORACLE],
        revealedBy: [ORACLE],
        secret: REVEAL,
    })
    const r = await runOnce(deps)
    expect(r.commit).toBe('already-committed')
    expect(r.reveal).toBe('already-revealed')
    expect(sent).toEqual([])
})

test('committed but secret missing: reports missing-secret, sends nothing', async () => {
    const {deps, sent} = fakeDeps({
        finalized: 41,
        height: 42,
        committedBy: [ORACLE],
        secret: undefined,
    })
    const r = await runOnce(deps)
    expect(r.reveal).toBe('missing-secret')
    expect(sent).toEqual([])
})

test('committed but below height: reveal waits for height', async () => {
    const {deps, sent} = fakeDeps({
        finalized: 41,
        height: 41,
        committedBy: [ORACLE],
        secret: REVEAL,
    })
    const r = await runOnce(deps)
    expect(r.commit).toBe('already-committed')
    expect(r.reveal).toBe('waiting-for-height')
    expect(sent).toEqual([])
})

test("only checks the oracle's own commit, not list non-emptiness", async () => {
    const OTHER = Name.from('greymass2')
    const {deps, sent} = fakeDeps({finalized: 41, height: 42, committedBy: [OTHER]})
    const r = await runOnce(deps)
    expect(r.commit).toBe('posted')
    expect(r.reveal).toBe('just-committed')
    expect(sent).toEqual(['commit'])
})

test('builders receive the target epoch and the right hashes', async () => {
    const fresh = fakeDeps({finalized: 41, height: 42})
    await runOnce(fresh.deps)
    expect(fresh.calls).toEqual([
        {kind: 'commit', oracle: 'greymass', epoch: 42, hash: String(COMMIT)},
    ])

    const ready = fakeDeps({finalized: 41, height: 42, committedBy: [ORACLE], secret: REVEAL})
    await runOnce(ready.deps)
    expect(ready.calls).toEqual([
        {kind: 'reveal', oracle: 'greymass', epoch: 42, hash: String(REVEAL)},
    ])
})

test('committed but commit count below threshold: waiting-for-commits', async () => {
    const {deps, sent} = fakeDeps({
        finalized: 41,
        height: 42,
        committedBy: [ORACLE],
        threshold: 2,
        secret: REVEAL,
    })
    const r = await runOnce(deps)
    expect(r.reveal).toBe('waiting-for-commits')
    expect(sent).toEqual([])
})

test('threshold met but commit not yet irreversible: waiting-for-finality', async () => {
    const {deps, sent} = fakeDeps({
        finalized: 41,
        height: 42,
        committedBy: [ORACLE],
        threshold: 1,
        secret: REVEAL,
        commitBlock: 200,
        libBlock: 100,
    })
    const r = await runOnce(deps)
    expect(r.reveal).toBe('waiting-for-finality')
    expect(sent).toEqual([])
})

test('threshold met and commit irreversible: reveal posted', async () => {
    const {deps, sent} = fakeDeps({
        finalized: 41,
        height: 42,
        committedBy: [ORACLE],
        threshold: 1,
        secret: REVEAL,
        commitBlock: 50,
        libBlock: 100,
    })
    const r = await runOnce(deps)
    expect(r.reveal).toBe('posted')
    expect(sent).toEqual(['reveal'])
})

test('no recorded commit block: falls back to head bound and waits', async () => {
    const {deps, sent, recorded} = fakeDeps({
        finalized: 41,
        height: 42,
        committedBy: [ORACLE],
        threshold: 1,
        secret: REVEAL,
        commitBlock: undefined,
        headBlock: 300,
        libBlock: 100,
    })
    const r = await runOnce(deps)
    expect(r.reveal).toBe('waiting-for-finality')
    expect(recorded.get(42)).toBe(300)
    expect(sent).toEqual([])
})

test('missing secret reported before the finality gate', async () => {
    const {deps, sent} = fakeDeps({
        finalized: 41,
        height: 42,
        committedBy: [ORACLE],
        threshold: 1,
        secret: undefined,
        commitBlock: 999,
        libBlock: 0,
    })
    const r = await runOnce(deps)
    expect(r.reveal).toBe('missing-secret')
    expect(sent).toEqual([])
})

test('records the commit block when posting a fresh commit', async () => {
    const {deps, recorded} = fakeDeps({finalized: 41, height: 41, postBlock: 777})
    await runOnce(deps)
    expect(recorded.get(42)).toBe(777)
})
