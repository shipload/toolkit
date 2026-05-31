import {expect, test} from 'bun:test'
import {upsertOracleSection} from './keygen'

test('appends an [oracle] section to an empty config', () => {
    const out = upsertOracleSection('', {handle: 'greymass', privateKey: 'PVT_K1_x'})
    expect(out).toContain('[oracle]')
    expect(out).toContain('handle = greymass')
    expect(out).toContain('private_key = PVT_K1_x')
})

test('appends without disturbing existing sections and comments', () => {
    const input = '[default]\n; my key\nprivate_key = PVT_K1_player\nactor = me\n'
    const out = upsertOracleSection(input, {handle: 'aaron', privateKey: 'PVT_K1_y'})
    expect(out).toContain('[default]')
    expect(out).toContain('; my key')
    expect(out).toContain('private_key = PVT_K1_player')
    expect(out).toContain('[oracle]')
    expect(out).toContain('handle = aaron')
    expect(out).toContain('private_key = PVT_K1_y')
})

test('updates an existing active [oracle] section in place, preserving other keys', () => {
    const input = '[oracle]\nhandle = old\nprivate_key = PVT_K1_old\nstore_path = /tmp/x.sqlite\n'
    const out = upsertOracleSection(input, {handle: 'new', privateKey: 'PVT_K1_new'})
    expect(out).toContain('handle = new')
    expect(out).toContain('private_key = PVT_K1_new')
    expect(out).toContain('store_path = /tmp/x.sqlite')
    expect(out).not.toContain('PVT_K1_old')
    expect(out).not.toContain('handle = old')
})

test('a commented [oracle] block is not treated as active (appends a real one)', () => {
    const input = '[default]\nactor = me\n\n; [oracle]\n; handle = example\n'
    const out = upsertOracleSection(input, {handle: 'real', privateKey: 'PVT_K1_z'})
    const activeHeaders = out.split('\n').filter((l) => l.trim() === '[oracle]')
    expect(activeHeaders.length).toBe(1)
    expect(out).toContain('handle = real')
})

test('adds private_key to an existing [oracle] section that lacks one', () => {
    const input = '[oracle]\nhandle = greymass\nstore_path = /tmp/x.sqlite\n'
    const out = upsertOracleSection(input, {handle: 'greymass', privateKey: 'PVT_K1_new'})
    expect(out).toContain('handle = greymass')
    expect(out).toContain('store_path = /tmp/x.sqlite')
    expect(out).toContain('private_key = PVT_K1_new')
})

test('appends correctly when input has no trailing newline', () => {
    const out = upsertOracleSection('[default]\nactor = me', {handle: 'h', privateKey: 'PVT_K1_a'})
    expect(out).toContain('actor = me')
    expect(out).toContain('[oracle]')
    expect(out).toContain('private_key = PVT_K1_a')
    expect(out.endsWith('\n')).toBe(true)
})

test('in-place update does not corrupt a following section', () => {
    const input = '[oracle]\nhandle = old\nprivate_key = PVT_K1_old\n[indexer]\nurl = https://x\n'
    const out = upsertOracleSection(input, {handle: 'new', privateKey: 'PVT_K1_new'})
    expect(out).toContain('handle = new')
    expect(out).toContain('[indexer]')
    expect(out).toContain('url = https://x')
    expect(out).not.toContain('PVT_K1_old')
})

test('preserves CRLF line endings', () => {
    const input = '[oracle]\r\nhandle = old\r\nprivate_key = PVT_K1_old\r\n'
    const out = upsertOracleSection(input, {handle: 'new', privateKey: 'PVT_K1_new'})
    expect(out).toContain('handle = new\r\n')
    expect(out).not.toMatch(/[^\r]\n/)
})
