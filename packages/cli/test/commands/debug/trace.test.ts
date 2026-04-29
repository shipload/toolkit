import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import {runDebugTrace} from '../../../src/commands/debug/trace'

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

const SAMPLE_TRACE = {
    id: '52f8ec3246b4791829cc88b6934730b430a88469c3176a78f866ee63d8419fb8',
    block_num: 1000,
    block_time: '2026-04-28T00:00:00',
    head_block_num: 1100,
    last_irreversible_block: 1095,
    irreversible: true,
    action_traces: [
        {
            act: {account: 'shipload.gm', name: 'travel', data: {}},
            receiver: 'shipload.gm',
            except: null,
        },
    ],
}

describe('runDebugTrace', () => {
    test('hits /transaction/{id}', async () => {
        const calls: string[] = []
        const orig = globalThis.fetch
        globalThis.fetch = ((url: string) => {
            calls.push(url)
            return Promise.resolve(new Response(JSON.stringify(SAMPLE_TRACE), {status: 200}))
        }) as typeof fetch
        restoreFetch = () => {
            globalThis.fetch = orig
        }

        await runDebugTrace({
            historyUrl: 'https://history.example',
            trxId: '52f8ec32',
            json: true,
        })

        expect(calls[0]).toBe('https://history.example/transaction/52f8ec32')
        const out = JSON.parse(captured.join('\n'))
        expect(out.id).toBe(SAMPLE_TRACE.id)
    })

    test('pretty output shows action names and irreversible status', async () => {
        const orig = globalThis.fetch
        globalThis.fetch = (() =>
            Promise.resolve(
                new Response(JSON.stringify(SAMPLE_TRACE), {status: 200})
            )) as typeof fetch
        restoreFetch = () => {
            globalThis.fetch = orig
        }

        await runDebugTrace({
            historyUrl: 'https://history.example',
            trxId: SAMPLE_TRACE.id,
            json: false,
        })

        const out = captured.join('\n')
        expect(out).toContain(SAMPLE_TRACE.id)
        expect(out).toContain('irreversible')
        expect(out).toContain('travel')
    })

    test('reports HTTP 404 with a clean message', async () => {
        const orig = globalThis.fetch
        globalThis.fetch = (() =>
            Promise.resolve(new Response('not found', {status: 404}))) as typeof fetch
        restoreFetch = () => {
            globalThis.fetch = orig
        }

        await expect(
            runDebugTrace({
                historyUrl: 'https://history.example',
                trxId: 'missing',
                json: false,
            })
        ).rejects.toThrow(/404/)
    })
})
