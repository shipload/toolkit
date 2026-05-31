import {afterEach, expect, test} from 'bun:test'
import {mkdtempSync, rmSync, statSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Checksum256} from '@wharfkit/antelope'
import {SecretStore} from './secret-store'

const dirs: string[] = []
function tmpStore(): {path: string; store: SecretStore} {
    const dir = mkdtempSync(join(tmpdir(), 'oracle-store-'))
    dirs.push(dir)
    const path = join(dir, 'nested', 'greymass.sqlite')
    return {path, store: new SecretStore(path)}
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
    const reopened = new SecretStore(path)
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
    const reopened = new SecretStore(path)
    expect(reopened.getCommitBlock(3)).toBe(999)
    reopened.close()
})
