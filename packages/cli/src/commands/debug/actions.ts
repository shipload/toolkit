import type {Command} from 'commander'
import {type ActivityResult, fetchActivity} from '../../lib/actionstream'
import {type EntityRef, parseEntityRef} from '../../lib/args'
import {getHistoryUrl} from '../../lib/config'

export interface DebugActionsOptions {
    historyUrl: string
    account: string
    actionName?: string
    contract?: string
    startSeq?: number
    untilSeq?: number
    entity?: EntityRef
    limit: number
    order: 'asc' | 'desc'
    json: boolean
}

const NESTED_KEYS = ['event', 'source', 'destination', 'entitytarget', 'paired_entity']

function asNumber(v: unknown): number | null {
    if (typeof v === 'number') return v
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v)
    if (typeof v === 'bigint') return Number(v)
    return null
}

export function matchesEntity(data: Record<string, unknown>, type: string, id: bigint): boolean {
    const idNum = Number(id)
    const topType = data.entity_type
    const topId = asNumber(data.id)
    if (topType === type && topId === idNum) return true
    for (const k of NESTED_KEYS) {
        const nested = data[k]
        if (nested && typeof nested === 'object') {
            const o = nested as Record<string, unknown>
            const nType = o.entity_type
            const nId = asNumber(o.entity_id)
            if (nType === type && nId === idNum) return true
        }
    }
    return false
}

export async function runDebugActions(opts: DebugActionsOptions): Promise<void> {
    const collected: ActivityResult[] = []
    let cursor: string | undefined
    let safety = 0
    while (collected.length < opts.limit) {
        if (++safety > 200) break
        const page = await fetchActivity({
            historyUrl: opts.historyUrl,
            account: opts.account,
            contract: opts.actionName ? (opts.contract ?? opts.account) : opts.contract,
            action: opts.actionName,
            limit: Math.min(opts.limit - collected.length, 100),
            order: opts.order,
            cursor,
            startSeq: cursor === undefined ? opts.startSeq : undefined,
        })
        for (const result of page.results) {
            if (
                opts.entity &&
                !matchesEntity(
                    result.action_trace.act.data,
                    opts.entity.entityType,
                    opts.entity.entityId
                )
            ) {
                continue
            }
            collected.push(result)
            if (collected.length >= opts.limit) break
        }
        if (
            opts.untilSeq !== undefined &&
            page.results.some((r) =>
                opts.order === 'desc'
                    ? r.global_action_seq <= opts.untilSeq!
                    : r.global_action_seq >= opts.untilSeq!
            )
        ) {
            break
        }
        if (!page.next_cursor) break
        cursor = page.next_cursor
    }

    if (opts.json) {
        console.log(JSON.stringify(collected, null, 2))
        return
    }

    if (collected.length === 0) {
        console.log('  No actions.')
        return
    }
    for (const r of collected) {
        const seq = r.global_action_seq
        const time = r.block_time
        const name = r.action_trace.act.name
        console.log(`${seq}  ${time}  ${name}`)
    }
}

export function registerSubcommand(parent: Command): void {
    parent
        .command('actions <account>')
        .description('Stream raw chain actions for an account from roborovski')
        .option('--action <name>', 'filter by action name (requires the same account as contract)')
        .option('--contract <account>', 'filter by act.account (overrides default of <account>)')
        .option('--start-seq <n>', 'cursor-jump to this seq', (v) => parseInt(v, 10))
        .option('--until-seq <n>', 'stop when this seq is reached', (v) => parseInt(v, 10))
        .option('--entity <type:id>', 'client-side filter to a specific entity', parseEntityRef)
        .option('--limit <n>', 'maximum results', (v) => parseInt(v, 10), 100)
        .option('--order <asc|desc>', 'seq order', 'desc')
        .option('--json', 'emit JSON', false)
        .action(
            async (
                account: string,
                opts: {
                    action?: string
                    contract?: string
                    startSeq?: number
                    untilSeq?: number
                    entity?: EntityRef
                    limit: number
                    order: string
                    json: boolean
                }
            ) => {
                await runDebugActions({
                    historyUrl: getHistoryUrl(),
                    account,
                    actionName: opts.action,
                    contract: opts.contract,
                    startSeq: opts.startSeq,
                    untilSeq: opts.untilSeq,
                    entity: opts.entity,
                    limit: opts.limit,
                    order: opts.order === 'asc' ? 'asc' : 'desc',
                    json: opts.json,
                })
            }
        )
}
