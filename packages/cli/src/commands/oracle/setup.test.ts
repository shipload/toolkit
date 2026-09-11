import {expect, test} from 'bun:test'
import {mkdtempSync, readFileSync, statSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {checkLine} from '../../lib/format'
import {hasExistingOracleKey, writeOracleKey} from './keygen'
import {ORACLE_GUIDE_URL, renderPasteBlock} from './setup'

test('writes the generated key into a fresh config at mode 0600', () => {
    const dir = mkdtempSync(join(tmpdir(), 'oracle-setup-'))
    const target = join(dir, 'nested', 'config.ini')
    const pubkey = writeOracleKey(target, '', 'mycoolnode')
    const written = readFileSync(target, 'utf8')
    expect(pubkey).toStartWith('PUB_K1_')
    expect(written).toContain('[oracle]')
    expect(written).toContain('handle = mycoolnode')
    expect(written).toMatch(/private_key = PVT_K1_/)
    expect(statSync(target).mode & 0o777).toBe(0o600)
})

test('writing preserves the rest of an existing config', () => {
    const dir = mkdtempSync(join(tmpdir(), 'oracle-setup-'))
    const target = join(dir, 'config.ini')
    writeFileSync(target, '[default]\nactor = me\nprivate_key = PVT_K1_player\n')
    const existing = readFileSync(target, 'utf8')
    writeOracleKey(target, existing, 'mycoolnode')
    const written = readFileSync(target, 'utf8')
    expect(written).toContain('actor = me')
    expect(written).toContain('PVT_K1_player')
    expect(written).toContain('handle = mycoolnode')
})

test('an existing oracle key is detected so setup can refuse without --force', () => {
    expect(hasExistingOracleKey('[oracle]\nhandle = a\nprivate_key = PVT_K1_x\n')).toBe(true)
    expect(hasExistingOracleKey('[oracle]\nhandle = a\n')).toBe(false)
    expect(hasExistingOracleKey('')).toBe(false)
})

test('check lines align their detail at a fixed column', () => {
    const lines = [
        checkLine('Checking Jungle 4', 'reachable (eon.shipload, epoch 412)'),
        checkLine('Checking handle', "'mycoolnode' is free"),
        checkLine('Reveal store', '/home/op/.config/shipload/oracle/mycoolnode.sqlite'),
    ]
    const columns = lines.map((l) => l.indexOf('...'))
    expect(new Set(columns).size).toBe(1)
    expect(lines[0]).toBe('Checking Jungle 4 ... reachable (eon.shipload, epoch 412)')
})

test('the paste block carries the handle and public key only', () => {
    const out = renderPasteBlock('mycoolnode', 'PUB_K1_6Rrvuj')
    expect(out).toContain('Oracle handle: mycoolnode')
    expect(out).toContain('Public key:    PUB_K1_6Rrvuj')
    expect(out).toContain(ORACLE_GUIDE_URL)
    expect(out).not.toContain('eon.shipload')
    expect(out).not.toContain('onboard-oracle')
    const block = out.split('\n').filter((l) => l.startsWith('  ') && !l.includes('---'))
    expect(block.length).toBe(2)
})
