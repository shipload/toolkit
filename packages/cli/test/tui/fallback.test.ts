import {describe, expect, test} from 'bun:test'
import {assertTty, type TtyEnv} from '../../src/tui/fallback'

describe('assertTty', () => {
    test('returns when stdout is a TTY', () => {
        const env: TtyEnv = {isTTY: true, write: () => {}, exit: () => {}}
        expect(() => assertTty('ship', 3n, env)).not.toThrow()
    })

    test('writes a friendly error and exits 2 when not a TTY', () => {
        const writes: string[] = []
        let exitCode: number | undefined
        const env: TtyEnv = {
            isTTY: false,
            write: (s) => writes.push(s),
            exit: (code) => {
                exitCode = code
                throw new Error('__exit__')
            },
        }
        expect(() => assertTty('ship', 3n, env)).toThrow('__exit__')
        expect(exitCode).toBe(2)
        const text = writes.join('')
        expect(text).toContain('requires a TTY')
        expect(text).toContain('ship 3 status')
    })
})
