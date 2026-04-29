import type {Command} from 'commander'
import {getHistoryUrl} from '../../lib/config'

export interface DebugTraceOptions {
    historyUrl: string
    trxId: string
    json: boolean
}

interface TraceResponse {
    id: string
    block_num: number
    block_time: string
    irreversible: boolean
    action_traces?: {
        act: {account: string; name: string; data: unknown}
        receiver: string
        except?: unknown
    }[]
}

export async function runDebugTrace(opts: DebugTraceOptions): Promise<void> {
    const base = opts.historyUrl.replace(/\/+$/, '')
    const url = `${base}/transaction/${encodeURIComponent(opts.trxId)}`
    const res = await fetch(url)
    if (!res.ok) {
        throw new Error(`txindex returned HTTP ${res.status}: ${await res.text()}`)
    }
    const trace = (await res.json()) as TraceResponse

    if (opts.json) {
        console.log(JSON.stringify(trace, null, 2))
        return
    }

    console.log(`tx:           ${trace.id}`)
    console.log(`block_num:    ${trace.block_num}`)
    console.log(`block_time:   ${trace.block_time}`)
    console.log(`irreversible: ${trace.irreversible}`)
    console.log('actions:')
    for (const a of trace.action_traces ?? []) {
        const status = a.except ? 'FAILED' : 'ok'
        console.log(`  - ${a.act.account}::${a.act.name}  ${status}  (recv: ${a.receiver})`)
    }
}

export function registerSubcommand(parent: Command): void {
    parent
        .command('trace <trx_id>')
        .description('Pull a full transaction trace from roborovski txindex')
        .option('--json', 'emit JSON', false)
        .action(async (trxId: string, opts: {json: boolean}) => {
            await runDebugTrace({
                historyUrl: getHistoryUrl(),
                trxId,
                json: opts.json,
            })
        })
}
