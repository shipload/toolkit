import Table from 'cli-table3'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES} from '../../lib/args'
import {getIndexerUrl} from '../../lib/config'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {summarizeEvent} from '../../lib/event-format'
import {formatTimeUTC} from '../../lib/format'
import {type EventRecord, fetchEvents} from '../../lib/indexer'
import {getAccountName} from '../../lib/session'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 1000
const DEFAULT_PAGE_SIZE = 100
const MAX_PAGE_SIZE = 1000

export interface HistoryOptions {
    indexerUrl: string
    account?: string
    entityId?: bigint
    eventType?: string
    limit: number
    fromSeq?: number
    pageSize: number
    json: boolean
}

function clamp(n: number, lo: number, hi: number): number {
    if (n < lo) return lo
    if (n > hi) return hi
    return n
}

export async function runHistory(opts: HistoryOptions): Promise<void> {
    const limit = clamp(opts.limit, 1, MAX_LIMIT)
    const pageSize = clamp(opts.pageSize, 1, MAX_PAGE_SIZE)

    const collected: EventRecord[] = []
    let fromSeq = opts.fromSeq
    let safety = 0
    const maxIterations = limit + 10
    while (collected.length < limit) {
        if (++safety > maxIterations) break
        const need = limit - collected.length
        const page = await fetchEvents({
            indexerUrl: opts.indexerUrl,
            owner: opts.account,
            entityId: opts.entityId !== undefined ? Number(opts.entityId) : undefined,
            eventType: opts.eventType,
            fromSeq,
            limit: Math.min(need, pageSize),
        })
        for (const e of page.events) {
            collected.push(e)
            if (collected.length >= limit) break
        }
        if (!page.has_more) break
        if (page.events.length === 0) break
        fromSeq = page.next_seq
    }

    if (opts.json) {
        console.log(JSON.stringify(collected, null, 2))
        return
    }

    if (collected.length === 0) {
        console.log('  No events.')
        return
    }

    const table = new Table({
        chars: {
            top: '',
            'top-mid': '',
            'top-left': '',
            'top-right': '',
            bottom: '',
            'bottom-mid': '',
            'bottom-left': '',
            'bottom-right': '',
            left: '  ',
            'left-mid': '',
            mid: '',
            'mid-mid': '',
            right: '',
            'right-mid': '',
            middle: '  ',
        },
        style: {head: [], border: []},
        head: ['seq', 'time', 'type', 'summary'],
        colAligns: ['right', 'left', 'left', 'left'],
    })
    for (const e of collected) {
        table.push([
            String(e.seq),
            formatTimeUTC(new Date(e.block_time)),
            e.type,
            summarizeEvent(e),
        ])
    }
    console.log(table.toString())
}

export function register(program: Command): void {
    program
        .command('history')
        .description('Show recent activity for an account')
        .argument('[account]', 'account to inspect (defaults to your session actor)')
        .option('--limit <n>', 'maximum number of events', (v) => parseInt(v, 10), DEFAULT_LIMIT)
        .option(
            '--type <event-type>',
            'filter to a single event type (e.g. travel, gather_started)'
        )
        .option('--from-seq <n>', 'start at a specific seq', (v) => parseInt(v, 10))
        .option(
            '--page-size <n>',
            'per-request page size',
            (v) => parseInt(v, 10),
            DEFAULT_PAGE_SIZE
        )
        .option('--json', 'emit JSON instead of formatted table', false)
        .action(
            async (
                account: string | undefined,
                opts: {
                    limit: number
                    type?: string
                    fromSeq?: number
                    pageSize: number
                    json: boolean
                }
            ) => {
                await runHistory({
                    indexerUrl: getIndexerUrl(),
                    account: account ?? getAccountName(),
                    eventType: opts.type,
                    limit: opts.limit,
                    fromSeq: opts.fromSeq,
                    pageSize: opts.pageSize,
                    json: opts.json,
                })
            }
        )
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'history',
    description: 'Show recent activity for the entity',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx: EntityContext) =>
        new Command('history')
            .description('Show recent activity for the entity')
            .option(
                '--limit <n>',
                'maximum number of events',
                (v) => parseInt(v, 10),
                DEFAULT_LIMIT
            )
            .option('--type <event-type>', 'filter to a single event type')
            .option('--from-seq <n>', 'start at a specific seq', (v) => parseInt(v, 10))
            .option(
                '--page-size <n>',
                'per-request page size',
                (v) => parseInt(v, 10),
                DEFAULT_PAGE_SIZE
            )
            .option('--json', 'emit JSON instead of formatted table', false)
            .action(
                async (opts: {
                    limit: number
                    type?: string
                    fromSeq?: number
                    pageSize: number
                    json: boolean
                }) => {
                    await runHistory({
                        indexerUrl: getIndexerUrl(),
                        entityId: ctx.entityId,
                        eventType: opts.type,
                        limit: opts.limit,
                        fromSeq: opts.fromSeq,
                        pageSize: opts.pageSize,
                        json: opts.json,
                    })
                }
            ),
}
