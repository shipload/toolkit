import {chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {PrivateKey} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {parse as parseIni} from 'ini'
import {assertOracleHandle, getUserConfigDir} from '../../lib/config'

export function upsertOracleSection(
    text: string,
    fields: {handle: string; privateKey: string}
): string {
    const eol = text.includes('\r\n') ? '\r\n' : '\n'
    const lines = text.split(/\r?\n/)
    const isHeader = (l: string): boolean => /^\s*\[[^\]]+\]\s*$/.test(l)
    const oracleStart = lines.findIndex((l) => /^\s*\[oracle\]\s*$/.test(l))
    if (oracleStart === -1) {
        const block = `[oracle]${eol}handle = ${fields.handle}${eol}private_key = ${fields.privateKey}${eol}`
        const trimmed = text.replace(/(\r?\n)+$/, '')
        return trimmed === '' ? block : `${trimmed}${eol}${eol}${block}`
    }
    let end = lines.length
    for (let i = oracleStart + 1; i < lines.length; i++) {
        if (isHeader(lines[i])) {
            end = i
            break
        }
    }
    const body = lines.slice(oracleStart + 1, end)
    let setHandle = false
    let setKey = false
    const updated = body.map((l) => {
        if (/^\s*handle\s*=/.test(l)) {
            setHandle = true
            return `handle = ${fields.handle}`
        }
        if (/^\s*private_key\s*=/.test(l)) {
            setKey = true
            return `private_key = ${fields.privateKey}`
        }
        return l
    })
    const inserts: string[] = []
    if (!setHandle) inserts.push(`handle = ${fields.handle}`)
    if (!setKey) inserts.push(`private_key = ${fields.privateKey}`)
    const joined = [
        ...lines.slice(0, oracleStart + 1),
        ...updated,
        ...inserts,
        ...lines.slice(end),
    ].join(eol)
    return joined.endsWith(eol) ? joined : joined + eol
}

function hasExistingOracleKey(text: string): boolean {
    const parsed = parseIni(text) as Record<string, unknown>
    const oracle = (parsed.oracle ?? {}) as Record<string, unknown>
    return typeof oracle.private_key === 'string' && oracle.private_key.length > 0
}

export function register(parent: Command): void {
    parent
        .command('keygen <handle>')
        .description(
            'Generate an oracle signing key, store it in the [oracle] config, and print the public key'
        )
        .option('--force', 'overwrite an existing [oracle] private_key', false)
        .option('--cwd', 'write to ./config.ini instead of the user config dir', false)
        .action((handle: string, opts: {force: boolean; cwd: boolean}) => {
            assertOracleHandle(handle)
            const target = opts.cwd
                ? join(process.cwd(), 'config.ini')
                : join(getUserConfigDir(), 'config.ini')
            const existing = existsSync(target) ? readFileSync(target, 'utf8') : ''
            if (hasExistingOracleKey(existing) && !opts.force) {
                console.error(
                    `An [oracle] private_key already exists in ${target}. Re-run with --force to overwrite.`
                )
                process.exitCode = 1
                return
            }
            const priv = PrivateKey.generate('K1')
            const pub = priv.toPublic()
            const updated = upsertOracleSection(existing, {handle, privateKey: String(priv)})
            mkdirSync(dirname(target), {recursive: true, mode: 0o700})
            writeFileSync(target, updated, {mode: 0o600})
            chmodSync(target, 0o600)
            console.log(`Generated oracle key for handle '${handle}' and wrote it to ${target}`)
            console.log('')
            console.log('Hand this PUBLIC key to the game deployer:')
            console.log('')
            console.log(`  ${String(pub)}`)
            console.log('')
            console.log(`It is the key for your oracle sub-permission (handle '${handle}').`)
            console.log('The private key is stored in your config (mode 0600) — keep it safe.')
            console.log('Verify your setup any time with: shiploadcli oracle status')
        })
}
