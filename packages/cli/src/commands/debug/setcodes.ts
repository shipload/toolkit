import {createHash} from 'node:crypto'
import {writeFileSync} from 'node:fs'
import {join} from 'node:path'
import type {Command} from 'commander'
import {fetchActivity} from '../../lib/actionstream'
import {getHistoryUrl} from '../../lib/config'
import {parseSetcodeHexData} from '../../lib/setcode-parser'

export interface DebugSetcodesOptions {
    historyUrl: string
    account: string
    extractDir?: string
    sinceDate?: string
    limit: number
    json: boolean
}

interface SetcodeEntry {
    seq: number
    block_time: string
    md5: string
    bytes: number
}

export async function runDebugSetcodes(opts: DebugSetcodesOptions): Promise<void> {
    const entries: SetcodeEntry[] = []
    const page = await fetchActivity({
        historyUrl: opts.historyUrl,
        account: opts.account,
        contract: 'eosio',
        action: 'setcode',
        startDate: opts.sinceDate,
        limit: opts.limit,
        order: 'desc',
    })
    for (const r of page.results) {
        const hex = r.action_trace.act.hex_data
        const parsed = parseSetcodeHexData(hex)
        const md5 = createHash('md5').update(parsed.code).digest('hex')
        entries.push({
            seq: r.global_action_seq,
            block_time: r.block_time,
            md5,
            bytes: parsed.code.length,
        })
        if (opts.extractDir) {
            const path = join(opts.extractDir, `${r.global_action_seq}.wasm`)
            writeFileSync(path, parsed.code)
        }
    }

    if (opts.json) {
        console.log(JSON.stringify(entries, null, 2))
        return
    }
    if (entries.length === 0) {
        console.log('  No setcode events.')
        return
    }
    for (const e of entries) {
        console.log(`${e.seq}  ${e.block_time}  ${e.md5}  ${e.bytes}b`)
    }
}

export function registerSubcommand(parent: Command): void {
    parent
        .command('setcodes <account>')
        .description('Enumerate eosio::setcode events targeting an account')
        .option('--extract <dir>', 'extract each WASM payload to <dir>/<seq>.wasm')
        .option('--since <yyyy-mm-dd>', 'only show events on or after this date')
        .option('--limit <n>', 'maximum results', (v) => parseInt(v, 10), 20)
        .option('--json', 'emit JSON', false)
        .action(
            async (
                account: string,
                opts: {extract?: string; since?: string; limit: number; json: boolean}
            ) => {
                await runDebugSetcodes({
                    historyUrl: getHistoryUrl(),
                    account,
                    extractDir: opts.extract,
                    sinceDate: opts.since,
                    limit: opts.limit,
                    json: opts.json,
                })
            }
        )
}
