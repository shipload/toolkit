import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import {matchesEntity, runDebugActions} from '../../../src/commands/debug/actions'

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

describe('matchesEntity', () => {
    test('top-level entity_type + id', () => {
        expect(
            matchesEntity({entity_type: 'ship', id: 3} as Record<string, unknown>, 'ship', 3n)
        ).toBe(true)
        expect(
            matchesEntity({entity_type: 'ship', id: 4} as Record<string, unknown>, 'ship', 3n)
        ).toBe(false)
    })

    test('nested source.entity_id (gather pattern)', () => {
        const data = {
            source: {entity_type: 'ship', entity_id: 3},
        } as Record<string, unknown>
        expect(matchesEntity(data, 'ship', 3n)).toBe(true)
    })

    test('nested destination, event, entitytarget, paired_entity', () => {
        for (const key of ['destination', 'event', 'entitytarget', 'paired_entity']) {
            const data = {[key]: {entity_type: 'ship', entity_id: 3}} as Record<string, unknown>
            expect(matchesEntity(data, 'ship', 3n)).toBe(true)
        }
    })

    test('returns false on completely unrelated data', () => {
        expect(matchesEntity({foo: 'bar'} as Record<string, unknown>, 'ship', 3n)).toBe(false)
    })
})

describe('runDebugActions', () => {
    function installFetch(responses: Response[]): void {
        const orig = globalThis.fetch
        let i = 0
        globalThis.fetch = (() => {
            const r = responses[i++]
            if (!r) throw new Error('unexpected extra fetch')
            return Promise.resolve(r)
        }) as typeof fetch
        restoreFetch = () => {
            globalThis.fetch = orig
        }
    }

    function actionResult(seq: number, name: string, data: Record<string, unknown> = {}): unknown {
        return {
            global_action_seq: seq,
            block_num: seq,
            block_time: '2026-04-28T18:19:09.000',
            irreversible: true,
            action_trace: {
                trx_id: 'abc',
                receiver: 'shipload.gm',
                act: {
                    account: 'shipload.gm',
                    name,
                    authorization: [],
                    hex_data: '00',
                    data,
                },
            },
        }
    }

    test('paginates while next_cursor is present, stops at limit', async () => {
        installFetch([
            new Response(
                JSON.stringify({
                    results: [actionResult(100, 'travel'), actionResult(101, 'recharge')],
                    next_cursor: 'C1',
                }),
                {status: 200}
            ),
            new Response(
                JSON.stringify({
                    results: [actionResult(102, 'travel')],
                    next_cursor: undefined,
                }),
                {status: 200}
            ),
        ])
        await runDebugActions({
            historyUrl: 'https://history.example',
            account: 'shipload.gm',
            limit: 5,
            order: 'desc',
            json: true,
        })
        const out = JSON.parse(captured.join('\n'))
        expect(out).toHaveLength(3)
        expect(out[0].action_trace.act.name).toBe('travel')
    })

    test('--action filter passes through to URL', async () => {
        const calls: string[] = []
        const orig = globalThis.fetch
        globalThis.fetch = ((url: string) => {
            calls.push(url)
            return Promise.resolve(
                new Response(JSON.stringify({results: [], next_cursor: undefined}), {
                    status: 200,
                })
            )
        }) as typeof fetch
        restoreFetch = () => {
            globalThis.fetch = orig
        }

        await runDebugActions({
            historyUrl: 'https://history.example',
            account: 'shipload.gm',
            actionName: 'cleartable',
            limit: 10,
            order: 'desc',
            json: true,
        })

        const url = new URL(calls[0])
        expect(url.searchParams.get('contract')).toBe('shipload.gm')
        expect(url.searchParams.get('action')).toBe('cleartable')
    })

    test('--entity filters client-side', async () => {
        installFetch([
            new Response(
                JSON.stringify({
                    results: [
                        actionResult(100, 'travel', {entity_type: 'ship', id: 3}),
                        actionResult(101, 'travel', {entity_type: 'ship', id: 4}),
                        actionResult(102, 'gather', {
                            source: {entity_type: 'ship', entity_id: 3},
                        }),
                    ],
                    next_cursor: undefined,
                }),
                {status: 200}
            ),
        ])
        await runDebugActions({
            historyUrl: 'https://history.example',
            account: 'shipload.gm',
            entity: {entityType: 'ship', entityId: 3n},
            limit: 100,
            order: 'desc',
            json: true,
        })
        const out = JSON.parse(captured.join('\n'))
        expect(out).toHaveLength(2)
        expect(out[0].global_action_seq).toBe(100)
        expect(out[1].global_action_seq).toBe(102)
    })

    test('--until-seq stops pagination when reached', async () => {
        installFetch([
            new Response(
                JSON.stringify({
                    results: [actionResult(120, 'travel'), actionResult(110, 'travel')],
                    next_cursor: 'C1',
                }),
                {status: 200}
            ),
        ])
        await runDebugActions({
            historyUrl: 'https://history.example',
            account: 'shipload.gm',
            untilSeq: 110,
            limit: 100,
            order: 'desc',
            json: true,
        })
        const out = JSON.parse(captured.join('\n'))
        // 110 is reached (inclusive); 120 is included; pagination stops.
        expect(out).toHaveLength(2)
    })
})
