import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import {mkdtempSync, readFileSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {runDebugCode} from '../../../src/commands/debug/code'

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
    workDir = mkdtempSync(join(tmpdir(), 'debug-code-test-'))
})
afterEach(() => {
    restoreLog?.()
    restoreFetch?.()
    rmSync(workDir, {recursive: true, force: true})
    restoreLog = null
    restoreFetch = null
})

const WASM_BYTES = Buffer.from('0061736d01000000', 'hex') // WASM magic + version
const ABI_BYTES = Buffer.from('ABI_PLACEHOLDER', 'utf8')

function installFetch(): void {
    const orig = globalThis.fetch
    globalThis.fetch = (() =>
        Promise.resolve(
            new Response(
                JSON.stringify({
                    wasm: WASM_BYTES.toString('base64'),
                    abi: ABI_BYTES.toString('base64'),
                }),
                {status: 200}
            )
        )) as typeof fetch
    restoreFetch = () => {
        globalThis.fetch = orig
    }
}

describe('runDebugCode', () => {
    test('writes <account>.wasm and <account>.abi to --out', async () => {
        installFetch()
        await runDebugCode({
            chainUrl: 'https://chain.example',
            account: 'shipload.gm',
            outDir: workDir,
            md5Only: false,
        })
        const wasm = readFileSync(join(workDir, 'shipload.gm.wasm'))
        const abi = readFileSync(join(workDir, 'shipload.gm.abi'))
        expect(Buffer.from(wasm).equals(WASM_BYTES)).toBe(true)
        expect(Buffer.from(abi).equals(ABI_BYTES)).toBe(true)
        expect(captured.join('\n')).toContain('shipload.gm.wasm')
        expect(captured.join('\n')).toContain('shipload.gm.abi')
    })

    test('--md5 prints md5 of WASM and skips file write', async () => {
        installFetch()
        await runDebugCode({
            chainUrl: 'https://chain.example',
            account: 'shipload.gm',
            outDir: workDir,
            md5Only: true,
        })
        const out = captured.join('\n')
        expect(out).toMatch(/[0-9a-f]{32}/)
        // No file should have been written:
        expect(() => readFileSync(join(workDir, 'shipload.gm.wasm'))).toThrow()
    })
})
