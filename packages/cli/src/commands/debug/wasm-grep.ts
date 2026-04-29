import type {Command} from 'commander'
import {grepDisassembly, type WasmRunner} from '../../lib/wasm-tools'

export interface DebugWasmGrepOptions {
    wasmPath: string
    patterns: string[]
    run?: WasmRunner
}

export async function runDebugWasmGrep(opts: DebugWasmGrepOptions): Promise<void> {
    const matches = await grepDisassembly(opts.wasmPath, opts.patterns, {run: opts.run})
    for (let i = 0; i < matches.length; i++) {
        console.log(`--- match ${i + 1} ---`)
        console.log(matches[i])
    }
    console.log(`${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`)
}

export function registerSubcommand(parent: Command): void {
    parent
        .command('wasm-grep <wasm-path> <pattern...>')
        .description(
            'Find regions of WASM disassembly matching all <pattern> fragments in order (±1 instr)'
        )
        .action(async (wasmPath: string, patterns: string[]) => {
            await runDebugWasmGrep({wasmPath, patterns})
        })
}
