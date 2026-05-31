import type {Command} from 'commander'
import {buildOracleContext, cleanOnce} from './context'
import {formatClean} from './format'

export function register(parent: Command): void {
    parent
        .command('clean')
        .description('Run one reserve-cleanup pass on the oldest uncleaned past epoch and exit')
        .option('--max-rows <n>', 'max reserve rows erased this pass', '100')
        .action(async (opts: {maxRows: string}) => {
            const maxRows = Math.max(1, Number(opts.maxRows))
            const ctx = await buildOracleContext()
            try {
                const result = await cleanOnce(ctx, maxRows)
                console.log(formatClean(result))
            } finally {
                ctx.close()
            }
        })
}
