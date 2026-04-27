import {Command} from 'commander'
import pkg from '../package.json' with {type: 'json'}
import * as addmodule from './commands/action/addmodule'
import * as blend from './commands/action/blend'
import * as cancel from './commands/action/cancel'
import * as claimstarter from './commands/action/claimstarter'
import * as craft from './commands/action/craft'
import * as deploy from './commands/action/deploy'
import * as foundcompany from './commands/action/foundcompany'
import * as gather from './commands/action/gather'
import * as grouptravel from './commands/action/grouptravel'
import * as join from './commands/action/join'
import * as recharge from './commands/action/recharge'
import * as resolve from './commands/action/resolve'
import * as rmmodule from './commands/action/rmmodule'
import * as track from './commands/action/track'
import * as transfer from './commands/action/transfer'
import * as travel from './commands/action/travel'
import * as wait from './commands/action/wait'
import * as warp from './commands/action/warp'
import * as wrap from './commands/action/wrap'
import * as init from './commands/init'
import * as config from './commands/query/config'
import * as entities from './commands/query/entities'
import * as entity from './commands/query/entity'
import * as epoch from './commands/query/epoch'
import * as inventory from './commands/query/inventory'
import * as items from './commands/query/items'
import * as location from './commands/query/location'
import * as modules from './commands/query/modules'
import * as nearby from './commands/query/nearby'
import * as nftinfo from './commands/query/nftinfo'
import * as player from './commands/query/player'
import * as recipe from './commands/query/recipe'
import * as resources from './commands/query/resources'
import * as shipLocation from './commands/query/ship-location'
import * as status from './commands/query/status'
import * as stratum from './commands/query/stratum'
import * as tasks from './commands/query/tasks'
import * as whoami from './commands/query/whoami'
import * as tools from './commands/tools'
import * as update from './commands/update'
import {parseEntityType} from './lib/args'
import {
    buildEntityParent,
    buildGenericEntityParent,
    registerEntitySubcommand,
} from './lib/entity-scope'

const PACKAGE = {
    name: 'shiploadcli',
    version: pkg.version,
    description: 'Shipload game CLI — query state and submit actions',
}

export function build(): Command {
    const program = new Command()
    program.name(PACKAGE.name).version(PACKAGE.version).description(PACKAGE.description)

    program.addHelpText(
        'before',
        [
            'Shipload CLI — query state and submit actions.',
            '',
            'First time?  Run: shiploadcli foundcompany "<name>" && shiploadcli join && shiploadcli claimstarter',
            '',
            'Commands are grouped as: Query (read-only), Action (transacting), Tools (diagnostics).',
            '',
        ].join('\n')
    )

    init.register(program)
    update.register(program)
    whoami.register(program)
    status.register(program)
    epoch.register(program)
    player.register(program)
    buildGenericEntityParent(program, parseEntityType, entity.defaultShow)
    buildEntityParent(program, 'ship', entity.defaultShow)
    buildEntityParent(program, 'container', entity.defaultShow)
    buildEntityParent(program, 'warehouse', entity.defaultShow)
    entities.register(program)
    location.register(program)
    registerEntitySubcommand(nearby.SUBCOMMAND)
    registerEntitySubcommand(shipLocation.SUBCOMMAND)
    items.register(program)
    recipe.register(program)
    config.register(program)
    resources.register(program)
    modules.register(program)
    nftinfo.register(program)
    stratum.register(program)
    registerEntitySubcommand(inventory.SUBCOMMAND)
    registerEntitySubcommand(inventory.SUBCOMMAND_CARGO_ALIAS)
    registerEntitySubcommand(tasks.SUBCOMMAND)

    foundcompany.register(program)
    join.register(program)
    claimstarter.register(program)
    registerEntitySubcommand(travel.SUBCOMMAND)
    grouptravel.register(program)
    registerEntitySubcommand(warp.SUBCOMMAND)
    registerEntitySubcommand(gather.SUBCOMMAND)
    registerEntitySubcommand(transfer.SUBCOMMAND)
    registerEntitySubcommand(recharge.SUBCOMMAND)
    registerEntitySubcommand(craft.SUBCOMMAND)
    registerEntitySubcommand(blend.SUBCOMMAND)
    registerEntitySubcommand(deploy.SUBCOMMAND)
    registerEntitySubcommand(wrap.SUBCOMMAND)
    registerEntitySubcommand(addmodule.SUBCOMMAND)
    registerEntitySubcommand(rmmodule.SUBCOMMAND)
    registerEntitySubcommand(resolve.SUBCOMMAND)
    registerEntitySubcommand(cancel.SUBCOMMAND)
    registerEntitySubcommand(wait.SUBCOMMAND)
    registerEntitySubcommand(track.SUBCOMMAND)

    tools.register(program)

    return program
}

export function run(argv: string[] = process.argv): void {
    const program = build()
    program.parse(argv)
    if (argv.slice(2).length === 0) {
        program.outputHelp()
    }
}
