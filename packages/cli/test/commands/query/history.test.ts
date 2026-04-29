import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import type {EventsResponse} from '../../../src/lib/indexer'
import {runHistory} from '../../../src/commands/query/history'

type FetchSpy = {
    calls: {url: string}[]
    queue: Response[]
}

function installFetch(spy: FetchSpy): () => void {
    const orig = globalThis.fetch
    globalThis.fetch = ((url: string) => {
        spy.calls.push({url})
        const res = spy.queue.shift()
        if (!res) throw new Error('unexpected extra fetch call')
        return Promise.resolve(res)
    }) as typeof fetch
    return () => {
        globalThis.fetch = orig
    }
}

function jsonResponse(body: EventsResponse): Response {
    return new Response(JSON.stringify(body), {status: 200})
}

const SAMPLE_TRAVEL = {
    block_num: 1000,
    block_time: '2026-04-28T17:32:19Z',
    seq: 1100,
    type: 'travel',
    type_code: 5,
    owner: 'alice',
    entity_id: 3,
    data: {entity_type: 'ship', id: 3, x: 5, y: 7},
}

let captured: string[] = []
let restoreLog: (() => void) | null = null
let restoreFetch: (() => void) | null = null

beforeEach(() => {
    captured = []
    const orig = console.log
    console.log = (s: unknown) => {
        captured.push(String(s))
    }
    restoreLog = () => {
        console.log = orig
    }
})
afterEach(() => {
    restoreLog?.()
    restoreFetch?.()
    restoreLog = null
    restoreFetch = null
})

describe('runHistory', () => {
    test('renders table with seq, time, type, summary columns', async () => {
        const spy: FetchSpy = {
            calls: [],
            queue: [
                jsonResponse({
                    latest_seq: 1100,
                    events: [SAMPLE_TRAVEL],
                    next_seq: 1101,
                    has_more: false,
                }),
            ],
        }
        restoreFetch = installFetch(spy)

        await runHistory({
            indexerUrl: 'https://idx.example.com',
            account: 'alice',
            limit: 50,
            pageSize: 100,
            json: false,
        })

        const out = captured.join('\n')
        expect(out).toContain('1100')
        expect(out).toContain('travel')
        expect(out).toContain('(5, 7)')
    })

    test('--json emits raw event array', async () => {
        const spy: FetchSpy = {
            calls: [],
            queue: [
                jsonResponse({
                    latest_seq: 1100,
                    events: [SAMPLE_TRAVEL],
                    next_seq: 1101,
                    has_more: false,
                }),
            ],
        }
        restoreFetch = installFetch(spy)

        await runHistory({
            indexerUrl: 'https://idx.example.com',
            account: 'alice',
            limit: 50,
            pageSize: 100,
            json: true,
        })

        const parsed = JSON.parse(captured.join('\n'))
        expect(Array.isArray(parsed)).toBe(true)
        expect(parsed[0].seq).toBe(1100)
        expect(parsed[0].type).toBe('travel')
    })

    test('account path sets owner filter, entityId path sets entity_id filter', async () => {
        const spy: FetchSpy = {
            calls: [],
            queue: [
                jsonResponse({latest_seq: 0, events: [], next_seq: 0, has_more: false}),
                jsonResponse({latest_seq: 0, events: [], next_seq: 0, has_more: false}),
            ],
        }
        restoreFetch = installFetch(spy)

        await runHistory({
            indexerUrl: 'https://idx.example.com',
            account: 'alice',
            limit: 10,
            pageSize: 100,
            json: true,
        })
        await runHistory({
            indexerUrl: 'https://idx.example.com',
            entityId: 3n,
            limit: 10,
            pageSize: 100,
            json: true,
        })

        expect(new URL(spy.calls[0].url).searchParams.get('owner')).toBe('alice')
        expect(new URL(spy.calls[0].url).searchParams.get('entity_id')).toBeNull()
        expect(new URL(spy.calls[1].url).searchParams.get('entity_id')).toBe('3')
        expect(new URL(spy.calls[1].url).searchParams.get('owner')).toBeNull()
    })

    test('pages while has_more and rows still needed, stops when limit reached', async () => {
        const spy: FetchSpy = {
            calls: [],
            queue: [
                jsonResponse({
                    latest_seq: 1200,
                    events: Array.from({length: 100}, (_, i) => ({
                        ...SAMPLE_TRAVEL,
                        seq: 1000 + i,
                    })),
                    next_seq: 1100,
                    has_more: true,
                }),
                jsonResponse({
                    latest_seq: 1200,
                    events: Array.from({length: 100}, (_, i) => ({
                        ...SAMPLE_TRAVEL,
                        seq: 1100 + i,
                    })),
                    next_seq: 1200,
                    has_more: true,
                }),
            ],
        }
        restoreFetch = installFetch(spy)

        await runHistory({
            indexerUrl: 'https://idx.example.com',
            account: 'alice',
            limit: 150,
            pageSize: 100,
            json: true,
        })

        expect(spy.calls).toHaveLength(2)
        expect(new URL(spy.calls[0].url).searchParams.get('from_seq')).toBeNull()
        expect(new URL(spy.calls[1].url).searchParams.get('from_seq')).toBe('1100')
        const parsed = JSON.parse(captured.join('\n'))
        expect(parsed).toHaveLength(150)
    })

    test('stops when has_more=false even if limit not filled', async () => {
        const spy: FetchSpy = {
            calls: [],
            queue: [
                jsonResponse({
                    latest_seq: 50,
                    events: [SAMPLE_TRAVEL, {...SAMPLE_TRAVEL, seq: 1101}],
                    next_seq: 1102,
                    has_more: false,
                }),
            ],
        }
        restoreFetch = installFetch(spy)

        await runHistory({
            indexerUrl: 'https://idx.example.com',
            account: 'alice',
            limit: 999,
            pageSize: 100,
            json: true,
        })

        expect(spy.calls).toHaveLength(1)
        const parsed = JSON.parse(captured.join('\n'))
        expect(parsed).toHaveLength(2)
    })

    test('eventType filter passes through', async () => {
        const spy: FetchSpy = {
            calls: [],
            queue: [jsonResponse({latest_seq: 0, events: [], next_seq: 0, has_more: false})],
        }
        restoreFetch = installFetch(spy)

        await runHistory({
            indexerUrl: 'https://idx.example.com',
            account: 'alice',
            eventType: 'travel',
            limit: 10,
            pageSize: 100,
            json: true,
        })

        expect(new URL(spy.calls[0].url).searchParams.get('event_type')).toBe('travel')
    })

    test('can fill --limit even when each page returns a single event', async () => {
        const queue: Response[] = []
        for (let i = 0; i < 75; i++) {
            queue.push(
                new Response(
                    JSON.stringify({
                        latest_seq: 200,
                        events: [{...SAMPLE_TRAVEL, seq: 100 + i}],
                        next_seq: 100 + i + 1,
                        has_more: i < 74,
                    }),
                    {status: 200}
                )
            )
        }
        const spy: FetchSpy = {calls: [], queue}
        restoreFetch = installFetch(spy)

        await runHistory({
            indexerUrl: 'https://idx.example.com',
            account: 'alice',
            limit: 75,
            pageSize: 1,
            json: true,
        })

        expect(spy.calls).toHaveLength(75)
        const parsed = JSON.parse(captured.join('\n'))
        expect(parsed).toHaveLength(75)
    })
})
