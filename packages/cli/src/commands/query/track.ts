import type {Command} from 'commander'
import {parseEntityType, parseUint32, type EntityTypeName} from '../../lib/args'
import {withValidation} from '../../lib/errors'
import {runFleetView} from '../../tui'

export function register(program: Command): void {
    program
        .command('track')
        .description(
            'Live full-screen TUI dashboard for every entity you own. Press Enter to drill into one. Quit with q.'
        )
        .option('--type <t>', 'filter by entity type (ship/container/warehouse)', parseEntityType)
        .option('--owner <name>', "show another player's fleet (defaults to self)")
        .option('--timeout <ms>', 'auto-exit after N ms (testing)', parseUint32)
        .action(async (opts: {type?: EntityTypeName; owner?: string; timeout?: number}) => {
            await withValidation(async () => {
                await runFleetView({owner: opts.owner, type: opts.type, timeoutMs: opts.timeout})
            })
        })
}
