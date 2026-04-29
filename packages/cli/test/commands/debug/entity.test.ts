import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import {runDebugEntity} from '../../../src/commands/debug/entity'

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

function installFetch(response: Response): void {
    const orig = globalThis.fetch
    globalThis.fetch = (() => Promise.resolve(response)) as typeof fetch
    restoreFetch = () => {
        globalThis.fetch = orig
    }
}

describe('runDebugEntity', () => {
    test('hits get_table_rows with the type as table and id bounds', async () => {
        const calls: {url: string; init?: RequestInit}[] = []
        const orig = globalThis.fetch
        globalThis.fetch = ((url: string, init?: RequestInit) => {
            calls.push({url, init})
            return Promise.resolve(
                new Response(
                    JSON.stringify({
                        rows: [{id: 3, owner: 'alice', name: 'test ship'}],
                        more: false,
                    }),
                    {status: 200}
                )
            )
        }) as typeof fetch
        restoreFetch = () => {
            globalThis.fetch = orig
        }

        await runDebugEntity({
            chainUrl: 'https://chain.example',
            entityType: 'ship',
            entityId: 3n,
            json: false,
        })

        expect(calls[0].url).toBe('https://chain.example/v1/chain/get_table_rows')
        const body = JSON.parse(calls[0].init?.body as string)
        expect(body.code).toBe('shipload.gm')
        expect(body.scope).toBe('shipload.gm')
        expect(body.table).toBe('ship')
        expect(body.lower_bound).toBe(3)
        expect(body.upper_bound).toBe(3)
    })

    test('--json prints the row as JSON', async () => {
        installFetch(new Response(JSON.stringify({rows: [{id: 3}], more: false}), {status: 200}))
        await runDebugEntity({
            chainUrl: 'https://chain.example',
            entityType: 'ship',
            entityId: 3n,
            json: true,
        })
        const parsed = JSON.parse(captured.join('\n'))
        expect(parsed.id).toBe(3)
    })

    test('prints helpful message when row not found', async () => {
        installFetch(new Response(JSON.stringify({rows: [], more: false}), {status: 200}))
        await runDebugEntity({
            chainUrl: 'https://chain.example',
            entityType: 'ship',
            entityId: 999n,
            json: false,
        })
        expect(captured.join('\n')).toContain('not found')
    })
})
