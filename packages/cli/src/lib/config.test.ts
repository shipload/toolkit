import {expect, test} from 'bun:test'
import {mkdtempSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {ConfigError, hasOracleConfig, loadConfig, loadOracleConfig} from './config'

function writeConfig(body: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'oracle-cfg-'))
    writeFileSync(join(dir, 'config.ini'), body)
    return dir
}

function opts(dir: string) {
    return {cwd: dir, userConfigDir: dir}
}

test('loads a full [oracle] section', () => {
    const dir = writeConfig(
        ['[oracle]', 'handle = greymass', 'private_key = PVT_K1_x', 'store_path = /tmp/g.sqlite'].join(
            '\n'
        )
    )
    const cfg = loadOracleConfig(opts(dir))
    expect(cfg.handle).toBe('greymass')
    expect(cfg.privateKey).toBe('PVT_K1_x')
    expect(cfg.storePath).toBe('/tmp/g.sqlite')
    expect(cfg.actor).toBe('eon.shipload')
    expect(cfg.permission).toBe('greymass')
})

test('store_path defaults under the user config dir, keyed by handle', () => {
    const dir = writeConfig(['[oracle]', 'handle = aaron', 'private_key = PVT_K1_y'].join('\n'))
    const cfg = loadOracleConfig(opts(dir))
    expect(cfg.storePath).toBe(join(dir, 'oracle', 'aaron.sqlite'))
})

test('actor falls back to [contracts] game when present', () => {
    const dir = writeConfig(
        ['[contracts]', 'game = test.gm', '[oracle]', 'handle = op', 'private_key = PVT_K1_z'].join(
            '\n'
        )
    )
    const cfg = loadOracleConfig(opts(dir))
    expect(cfg.actor).toBe('test.gm')
})

test('missing handle throws ConfigError', () => {
    const dir = writeConfig(['[oracle]', 'private_key = PVT_K1_x'].join('\n'))
    expect(() => loadOracleConfig(opts(dir))).toThrow(ConfigError)
})

test('missing private_key throws ConfigError', () => {
    const dir = writeConfig(['[oracle]', 'handle = greymass'].join('\n'))
    expect(() => loadOracleConfig(opts(dir))).toThrow(ConfigError)
})

test('invalid handle (underscore) throws ConfigError', () => {
    const dir = writeConfig(
        ['[oracle]', 'handle = grey_mass', 'private_key = PVT_K1_x'].join('\n')
    )
    expect(() => loadOracleConfig(opts(dir))).toThrow(ConfigError)
})

test('leading-dot handle throws ConfigError', () => {
    const dir = writeConfig(['[oracle]', 'handle = .oracle', 'private_key = PVT_K1_x'].join('\n'))
    expect(() => loadOracleConfig(opts(dir))).toThrow(ConfigError)
})

test('no [oracle] section throws ConfigError', () => {
    const dir = writeConfig(['[default]', 'private_key = PVT_K1_a', 'actor = someplayer'].join('\n'))
    expect(() => loadOracleConfig(opts(dir))).toThrow(ConfigError)
})

test('hasOracleConfig is true when an [oracle] handle is present', () => {
    const dir = writeConfig(['[oracle]', 'handle = greymass', 'private_key = PVT_K1_x'].join('\n'))
    expect(hasOracleConfig(opts(dir))).toBe(true)
})

test('hasOracleConfig is false when there is no [oracle] section', () => {
    const dir = writeConfig(['[default]', 'private_key = PVT_K1_a', 'actor = someplayer'].join('\n'))
    expect(hasOracleConfig(opts(dir))).toBe(false)
})

test('atomicAssetsContract defaults to atomicassets', () => {
    const dir = writeConfig(['[default]', 'private_key = PVT_K1_a', 'actor = someplayer'].join('\n'))
    const cfg = loadConfig(opts(dir))
    expect(cfg.atomicAssetsContract).toBe('atomicassets')
})

test('atomicAssetsContract reads [contracts] atomicassets', () => {
    const dir = writeConfig(
        [
            '[default]',
            'private_key = PVT_K1_a',
            'actor = someplayer',
            '[contracts]',
            'atomicassets = atomic.gm',
        ].join('\n')
    )
    const cfg = loadConfig(opts(dir))
    expect(cfg.atomicAssetsContract).toBe('atomic.gm')
})

test('fundContract defaults to fnd.shipload', () => {
    const dir = writeConfig(['[default]', 'private_key = PVT_K1_a', 'actor = someplayer'].join('\n'))
    const cfg = loadConfig(opts(dir))
    expect(cfg.fundContract).toBe('fnd.shipload')
})

test('fundContract reads [contracts] fund', () => {
    const dir = writeConfig(
        [
            '[default]',
            'private_key = PVT_K1_a',
            'actor = someplayer',
            '[contracts]',
            'fund = fund.gm',
        ].join('\n')
    )
    const cfg = loadConfig(opts(dir))
    expect(cfg.fundContract).toBe('fund.gm')
})

test('explicit actor and permission override the defaults', () => {
    const dir = writeConfig(
        [
            '[oracle]',
            'handle = op',
            'private_key = PVT_K1_x',
            'actor = custom.acct',
            'permission = custom',
        ].join('\n')
    )
    const cfg = loadOracleConfig(opts(dir))
    expect(cfg.actor).toBe('custom.acct')
    expect(cfg.permission).toBe('custom')
})
