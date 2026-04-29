import {createHash} from 'node:crypto'
import {writeFileSync} from 'node:fs'
import {join} from 'node:path'
import type {Command} from 'commander'
import {getRawCodeAndAbi} from '../../lib/chain-debug'
import {getChainUrl} from '../../lib/config'

export interface DebugCodeOptions {
    chainUrl: string
    account: string
    outDir: string
    md5Only: boolean
}

export async function runDebugCode(opts: DebugCodeOptions): Promise<void> {
    const {wasm, abi} = await getRawCodeAndAbi({
        chainUrl: opts.chainUrl,
        account_name: opts.account,
    })
    const wasmBytes = Buffer.from(wasm, 'base64')
    const abiBytes = Buffer.from(abi, 'base64')

    if (opts.md5Only) {
        const wasmMd5 = createHash('md5').update(wasmBytes).digest('hex')
        const abiMd5 = createHash('md5').update(abiBytes).digest('hex')
        console.log(`wasm md5: ${wasmMd5} (${wasmBytes.length} bytes)`)
        console.log(`abi  md5: ${abiMd5} (${abiBytes.length} bytes)`)
        return
    }

    const wasmPath = join(opts.outDir, `${opts.account}.wasm`)
    const abiPath = join(opts.outDir, `${opts.account}.abi`)
    writeFileSync(wasmPath, wasmBytes)
    writeFileSync(abiPath, abiBytes)
    console.log(`Wrote ${wasmPath} (${wasmBytes.length} bytes)`)
    console.log(`Wrote ${abiPath} (${abiBytes.length} bytes)`)
}

export function registerSubcommand(parent: Command): void {
    parent
        .command('code <account>')
        .description('Fetch the currently-deployed WASM + ABI for an account')
        .option('--out <dir>', 'output directory', '.')
        .option('--md5', 'print md5 only, no files', false)
        .action(async (account: string, opts: {out: string; md5: boolean}) => {
            await runDebugCode({
                chainUrl: getChainUrl(),
                account,
                outDir: opts.out,
                md5Only: opts.md5,
            })
        })
}
