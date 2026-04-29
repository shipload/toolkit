import type {Command} from 'commander'
import {listImports, type WasmRunner} from '../../lib/wasm-tools'

export interface DebugWasmImportsOptions {
    wasmPath: string
    filter?: string
    run?: WasmRunner
}

export async function runDebugWasmImports(opts: DebugWasmImportsOptions): Promise<void> {
    const imports = await listImports(opts.wasmPath, {run: opts.run})
    const matches = opts.filter ? imports.filter((i) => i.includes(opts.filter as string)) : imports
    for (const i of matches) {
        console.log(i)
    }
}

export function registerSubcommand(parent: Command): void {
    parent
        .command('wasm-imports <wasm-path>')
        .description('List host intrinsics imported by a WASM binary (requires wabt)')
        .option('--filter <substring>', 'show only imports containing this substring')
        .action(async (wasmPath: string, opts: {filter?: string}) => {
            await runDebugWasmImports({wasmPath, filter: opts.filter})
        })
}
