import {chmodSync, existsSync, mkdirSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import type {Command} from 'commander'
import {getUserConfigDir} from '../lib/config'

const STUB = `[default]
; Private key that signs transactions. Treat this file as a secret —
; it has full spending authority for the account below.
private_key = PVT_K1_REPLACE_ME

; Antelope account this CLI acts as.
actor = myaccount

; Permission to sign with. Defaults to "active" if omitted.
permission = active

; Automatically resolve completed tasks after wait/track finishes. Defaults to false.
; auto_resolve = false

; Uncomment and set this to enable \`shiploadcli history\` and entity history
; subcommands (e.g. \`shiploadcli ship 1 history\`). The URL points at a
; running shiploadindex instance.
; [indexer]
; url = https://your-shiploadindex-host

; Uncomment and set this to enable \`shiploadcli debug entity\`, \`debug code\`,
; and \`debug setcodes\` cross-checks. The URL points at an Antelope chain v1 API.
; [chain]
; url = https://jungle4.greymass.com

; Uncomment and set this to enable \`shiploadcli debug actions\`, \`debug setcodes\`,
; and \`debug trace\`. The URL points at a roborovski actionstream HTTP frontend.
; [history]
; url = https://jungle4.roborovski.io
`

export interface InitOptions {
    targetPath: string
    force: boolean
}

export interface InitResult {
    written: boolean
    path: string
}

export function runInit(opts: InitOptions): InitResult {
    if (existsSync(opts.targetPath) && !opts.force) {
        throw new Error(
            `Config already exists at ${opts.targetPath}. Re-run with --force to overwrite.`
        )
    }
    mkdirSync(dirname(opts.targetPath), {recursive: true, mode: 0o700})
    writeFileSync(opts.targetPath, STUB, {mode: 0o600})
    chmodSync(opts.targetPath, 0o600)
    return {written: true, path: opts.targetPath}
}

export function register(program: Command): void {
    program
        .command('init')
        .description('Create a stub config.ini in the user config directory')
        .option('--force', 'overwrite an existing config.ini', false)
        .option('--cwd', 'write to ./config.ini instead of the user config dir', false)
        .action((options: {force: boolean; cwd: boolean}) => {
            const target = options.cwd
                ? join(process.cwd(), 'config.ini')
                : join(getUserConfigDir(), 'config.ini')
            try {
                const result = runInit({targetPath: target, force: options.force})
                console.log(`Wrote stub config to ${result.path}`)
                console.log('')
                console.log('Next steps:')
                console.log(`  1. Edit ${result.path}`)
                console.log('  2. Replace PVT_K1_REPLACE_ME with your private key')
                console.log("  3. Replace 'myaccount' with your Antelope account name")
                console.log('')
                console.log('File mode is 0600 (owner read/write only).')
            } catch (err) {
                console.error((err as Error).message)
                process.exitCode = 1
            }
        })
}
