import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {runDebugSetcodes} from '../../../src/commands/debug/setcodes'

let captured: string[] = []
let restoreLog: (() => void) | null = null
let restoreFetch: (() => void) | null = null
let workDir: string

beforeEach(() => {
    captured = []
    const orig = console.log
    console.log = (s: unknown) => {
        captured.push(String(s))
    }
    restoreLog = () => {
        console.log = orig
    }
    workDir = mkdtempSync(join(tmpdir(), 'debug-setcodes-test-'))
})
afterEach(() => {
    restoreLog?.()
    restoreFetch?.()
    rmSync(workDir, {recursive: true, force: true})
    restoreLog = null
    restoreFetch = null
})

function buildSetcodeHex(codeHex: string): string {
    // 8 bytes account LE + 1 vmtype + 1 vmversion + varuint length + code
    const code = Buffer.from(codeHex, 'hex')
    const parts: number[] = []
    for (let i = 0; i < 8; i++) parts.push(0)
    parts.push(0)
    parts.push(0)
    let len = code.length
    do {
        let byte = len & 0x7f
        len >>>= 7
        if (len !== 0) byte |= 0x80
        parts.push(byte)
    } while (len !== 0)
    return Buffer.concat([Buffer.from(parts), code]).toString('hex')
}

describe('runDebugSetcodes', () => {
    test('lists setcode events with seq, block_time, and md5', async () => {
        const wasmHex = '0061736d01000000'
        const orig = globalThis.fetch
        globalThis.fetch = (() =>
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        results: [
                            {
                                global_action_seq: 200,
                                block_num: 200,
                                block_time: '2026-04-25T00:00:00.000',
                                irreversible: true,
                                action_trace: {
                                    trx_id: 'x',
                                    receiver: 'eosio',
                                    act: {
                                        account: 'eosio',
                                        name: 'setcode',
                                        authorization: [],
                                        hex_data: buildSetcodeHex(wasmHex),
                                        data: {},
                                    },
                                },
                            },
                        ],
                        next_cursor: undefined,
                    }),
                    {status: 200}
                )
            )) as typeof fetch
        restoreFetch = () => {
            globalThis.fetch = orig
        }

        await runDebugSetcodes({
            historyUrl: 'https://history.example',
            account: 'shipload.gm',
            extractDir: undefined,
            sinceDate: undefined,
            limit: 20,
            json: false,
        })

        const out = captured.join('\n')
        expect(out).toContain('200')
        expect(out).toContain('2026-04-25')
        expect(out).toMatch(/[0-9a-f]{32}/)
    })

    test('--extract writes <seq>.wasm files to the directory', async () => {
        const wasmHex = '0061736d01000000'
        const orig = globalThis.fetch
        globalThis.fetch = (() =>
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        results: [
                            {
                                global_action_seq: 200,
                                block_num: 200,
                                block_time: '2026-04-25T00:00:00.000',
                                irreversible: true,
                                action_trace: {
                                    trx_id: 'x',
                                    receiver: 'eosio',
                                    act: {
                                        account: 'eosio',
                                        name: 'setcode',
                                        authorization: [],
                                        hex_data: buildSetcodeHex(wasmHex),
                                        data: {},
                                    },
                                },
                            },
                        ],
                        next_cursor: undefined,
                    }),
                    {status: 200}
                )
            )) as typeof fetch
        restoreFetch = () => {
            globalThis.fetch = orig
        }

        await runDebugSetcodes({
            historyUrl: 'https://history.example',
            account: 'shipload.gm',
            extractDir: workDir,
            sinceDate: undefined,
            limit: 20,
            json: false,
        })

        expect(existsSync(join(workDir, '200.wasm'))).toBe(true)
        const contents = readFileSync(join(workDir, '200.wasm'))
        expect(Buffer.from(contents).toString('hex')).toBe(wasmHex)
    })
})
