import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import {runDebugWasmGrep} from '../../../src/commands/debug/wasm-grep'

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

const DISASM = `
func[42]:
  i32.const 1000000
  local.get 1
  i32.mul
  i64.extend_i32_u
  return
`

describe('runDebugWasmGrep', () => {
    test('prints matching slice plus match count', async () => {
        await runDebugWasmGrep({
            wasmPath: '/tmp/x.wasm',
            patterns: ['i32.const 1000000', 'i32.mul', 'i64.extend_i32_u'],
            run: async () => DISASM,
        })
        const out = captured.join('\n')
        expect(out).toContain('i32.const 1000000')
        expect(out).toContain('1 match')
    })

    test('reports zero matches cleanly', async () => {
        await runDebugWasmGrep({
            wasmPath: '/tmp/x.wasm',
            patterns: ['i32.const 1000000', 'i64.extend_i32_s'],
            run: async () => DISASM,
        })
        const out = captured.join('\n')
        expect(out).toContain('0 matches')
    })
})
