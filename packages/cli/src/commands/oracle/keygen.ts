import {chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {PrivateKey} from '@wharfkit/antelope'
import {Command} from 'commander'
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

export function hasExistingOracleKey(text: string): boolean {
    const parsed = parseIni(text) as Record<string, unknown>
    const oracle = (parsed.oracle ?? {}) as Record<string, unknown>
    return typeof oracle.private_key === 'string' && oracle.private_key.length > 0
}

export function oracleConfigTarget(cwd: boolean): string {
    return cwd ? join(process.cwd(), 'config.ini') : join(getUserConfigDir(), 'config.ini')
}

export function readConfigText(target: string): string {
    return existsSync(target) ? readFileSync(target, 'utf8') : ''
}

export function defaultStorePath(handle: string): string {
    return join(getUserConfigDir(), 'oracle', `${handle}.sqlite`)
}

/** Generate a K1 key, write it into the [oracle] section at mode 0600, return the public key. */
export function writeOracleKey(target: string, existing: string, handle: string): string {
    const priv = PrivateKey.generate('K1')
    const updated = upsertOracleSection(existing, {handle, privateKey: String(priv)})
    mkdirSync(dirname(target), {recursive: true, mode: 0o700})
    writeFileSync(target, updated, {mode: 0o600})
    chmodSync(target, 0o600)
    return String(priv.toPublic())
}

export function register(parent: Command): void {
    const cmd = new Command('keygen')
        .argument('<handle>')
        .description(
            'Generate an oracle signing key, store it in the [oracle] config, and print the public key'
        )
        .option('--force', 'overwrite an existing [oracle] private_key', false)
        .option('--cwd', 'write to ./config.ini instead of the user config dir', false)
        .action((handle: string, opts: {force: boolean; cwd: boolean}) => {
            assertOracleHandle(handle)
            const target = oracleConfigTarget(opts.cwd)
            const existing = readConfigText(target)
            if (hasExistingOracleKey(existing) && !opts.force) {
                console.error(
                    `An [oracle] private_key already exists in ${target}. Re-run with --force to overwrite.`
                )
                process.exitCode = 1
                return
            }
            const pub = writeOracleKey(target, existing, handle)
            console.log(`Generated oracle key for handle '${handle}' and wrote it to ${target}`)
            console.log('')
            console.log('Hand this PUBLIC key to the game deployer:')
            console.log('')
            console.log(`  ${pub}`)
            console.log('')
            console.log(`It is the key for your oracle sub-permission (handle '${handle}').`)
            console.log('The private key is stored in your config (mode 0600). Keep it safe.')
            console.log('Verify your setup any time with: shiploadcli oracle status')
        })
    parent.addCommand(cmd, {hidden: true})
}
