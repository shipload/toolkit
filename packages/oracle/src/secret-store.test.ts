import {Database} from 'bun:sqlite'
import {afterEach, expect, test} from 'bun:test'
import {mkdtempSync, rmSync, statSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Checksum256} from '@wharfkit/antelope'
import {SecretStore, StaleSecretStoreError} from './secret-store'

const CHAIN_A = '73e4385a2708e6d7048834fbc1079f2fabb17b3c125b146af438971e90716c4d'
const CHAIN_B = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

const dirs: string[] = []
function tmpStore(chainId = CHAIN_A): {path: string; store: SecretStore} {
    const dir = mkdtempSync(join(tmpdir(), 'oracle-store-'))
    dirs.push(dir)
    const path = join(dir, 'nested', 'greymass.sqlite')
    return {path, store: new SecretStore(path, chainId)}
}

afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, {recursive: true, force: true})
})

test('getOrCreate is idempotent for the same epoch', () => {
    const {store} = tmpStore()
    const a = store.getOrCreate(5)
    const b = store.getOrCreate(5)
    expect(a.commit.equals(b.commit)).toBe(true)
    expect(a.reveal.equals(b.reveal)).toBe(true)
    store.close()
})

test('commit is sha256 of the raw reveal bytes (matches contract reveal check)', () => {
    const {store} = tmpStore()
    const s = store.getOrCreate(7)
    const expected = Checksum256.hash(s.reveal.array)
    expect(s.commit.equals(expected)).toBe(true)
    store.close()
})

test('getReveal returns the stored reveal, or undefined when absent', () => {
    const {store} = tmpStore()
    const s = store.getOrCreate(9)
    expect(store.getReveal(9)?.equals(s.reveal)).toBe(true)
    expect(store.getReveal(10)).toBeUndefined()
    store.close()
})

test('secrets persist across reopen', () => {
    const {path, store} = tmpStore()
    const s = store.getOrCreate(3)
    store.close()
    const reopened = new SecretStore(path, CHAIN_A)
    expect(reopened.getReveal(3)?.equals(s.reveal)).toBe(true)
    reopened.close()
})

test('store file is created with mode 0600', () => {
    const {path, store} = tmpStore()
    store.getOrCreate(1)
    expect(statSync(path).mode & 0o777).toBe(0o600)
    store.close()
})

test('commit block is undefined until recorded, then round-trips', () => {
    const {store} = tmpStore()
    store.getOrCreate(7)
    expect(store.getCommitBlock(7)).toBeUndefined()
    store.recordCommitBlock(7, 12345)
    expect(store.getCommitBlock(7)).toBe(12345)
    store.close()
})

test('commit block persists across reopen', () => {
    const {path, store} = tmpStore()
    store.getOrCreate(3)
    store.recordCommitBlock(3, 999)
    store.close()
    const reopened = new SecretStore(path, CHAIN_A)
    expect(reopened.getCommitBlock(3)).toBe(999)
    reopened.close()
})

test('describe reports the pinned chain, stored chains, and row count', () => {
    const {store} = tmpStore()
    store.getOrCreate(1)
    store.getOrCreate(2)
    expect(store.describe()).toEqual({
        chainId: CHAIN_A,
        storedChainIds: [CHAIN_A],
        usable: true,
        rows: 2,
    })
    store.close()
})

test('a store holding another chain refuses every secret operation and names oracle reset', () => {
    const {path} = tmpStore(CHAIN_A)
    const seed = new SecretStore(path, CHAIN_A)
    seed.getOrCreate(1)
    seed.close()

    const store = new SecretStore(path, CHAIN_B)
    expect(store.describe().usable).toBe(false)
    expect(() => store.getOrCreate(1)).toThrow(/oracle reset/)
    expect(() => store.getReveal(1)).toThrow(StaleSecretStoreError)
    expect(() => store.getCommitBlock(1)).toThrow(StaleSecretStoreError)
    expect(() => store.recordCommitBlock(1, 5)).toThrow(StaleSecretStoreError)
    store.close()
})

test('reset clears every stored secret regardless of chain and makes the store usable again', () => {
    const {path} = tmpStore(CHAIN_A)
    const seed = new SecretStore(path, CHAIN_A)
    seed.getOrCreate(1)
    seed.close()

    const store = new SecretStore(path, CHAIN_B)
    expect(store.describe().usable).toBe(false)
    store.reset()
    expect(store.describe()).toEqual({chainId: CHAIN_B, storedChainIds: [], usable: true, rows: 0})
    const secret = store.getOrCreate(1)
    expect(secret.commit).toBeDefined()
    store.close()
})

test('a legacy epoch-keyed store migrates existing rows to the running chain and keeps them usable', () => {
    const dir = mkdtempSync(join(tmpdir(), 'oracle-store-legacy-'))
    dirs.push(dir)
    const path = join(dir, 'legacy.sqlite')
    const legacy = new Database(path, {create: true})
    legacy.run(`CREATE TABLE secrets (
        epoch INTEGER PRIMARY KEY,
        commitValue TEXT NOT NULL,
        revealValue TEXT NOT NULL,
        commitBlock INTEGER
    )`)
    legacy.run(
        'INSERT INTO secrets (epoch, commitValue, revealValue, commitBlock) VALUES (1, ?, ?, ?)',
        ['a'.repeat(64), 'b'.repeat(64), 100]
    )
    legacy.close()

    const store = new SecretStore(path, CHAIN_A)
    expect(store.describe()).toEqual({
        chainId: CHAIN_A,
        storedChainIds: [CHAIN_A],
        usable: true,
        rows: 1,
    })
    expect(store.getReveal(1)?.hexString).toBe('b'.repeat(64))
    expect(store.getCommitBlock(1)).toBe(100)
    expect(store.getOrCreate(1).commit.hexString).toBe('a'.repeat(64))
    store.close()

    const reopened = new SecretStore(path, CHAIN_A)
    expect(reopened.getReveal(1)?.hexString).toBe('b'.repeat(64))
    reopened.close()
})
