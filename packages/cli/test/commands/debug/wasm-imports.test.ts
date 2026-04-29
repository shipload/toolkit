import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import {runDebugWasmImports} from '../../../src/commands/debug/wasm-imports'

let captured: string[] = []
let restoreLog: (() => void) | null = null

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
    restoreLog = null
})

const SAMPLE_OBJDUMP_OUTPUT = `
shipload.gm.wasm:	file format wasm 0x1
Section Details:
Import[3]:
 - func[0] sig=0 <env.db_store_i64> <- env.db_store_i64
 - func[1] sig=1 <env.db_remove_i64> <- env.db_remove_i64
 - func[2] sig=2 <env.current_time> <- env.current_time
`

describe('runDebugWasmImports', () => {
    test('prints each import on its own line', async () => {
        await runDebugWasmImports({
            wasmPath: '/tmp/x.wasm',
            filter: undefined,
            run: async () => SAMPLE_OBJDUMP_OUTPUT,
        })
        const out = captured.join('\n')
        expect(out).toContain('env.db_store_i64')
        expect(out).toContain('env.db_remove_i64')
        expect(out).toContain('env.current_time')
    })

    test('--filter narrows by substring', async () => {
        await runDebugWasmImports({
            wasmPath: '/tmp/x.wasm',
            filter: 'db_',
            run: async () => SAMPLE_OBJDUMP_OUTPUT,
        })
        const out = captured.join('\n')
        expect(out).toContain('env.db_store_i64')
        expect(out).toContain('env.db_remove_i64')
        expect(out).not.toContain('env.current_time')
    })
})
