import {Command} from 'commander'
import pkg from '../package.json' with {type: 'json'}
import * as addmodule from './commands/action/addmodule'
import * as blend from './commands/action/blend'
import * as buildplot from './commands/action/buildplot'
import * as cancel from './commands/action/cancel'
import * as claimplot from './commands/action/claimplot'
import * as craft from './commands/action/craft'
import * as demolish from './commands/action/demolish'
import * as deploy from './commands/action/deploy'
import * as foundcompany from './commands/action/foundcompany'
import * as gather from './commands/action/gather'
import * as grouptravel from './commands/action/grouptravel'
import * as join from './commands/action/join'
import * as recharge from './commands/action/recharge'
import * as refrshentity from './commands/action/refrshentity'
import * as resolve from './commands/action/resolve'
import * as rmmodule from './commands/action/rmmodule'
import * as route from './commands/route'
import * as track from './commands/action/track'
import * as transfer from './commands/action/transfer'
import * as travel from './commands/action/travel'
import * as undeploy from './commands/action/undeploy'
import * as wait from './commands/action/wait'
import * as warp from './commands/action/warp'
import * as wrap from './commands/action/wrap'
import * as wrapentity from './commands/action/wrapentity'
import * as init from './commands/init'
import * as config from './commands/query/config'
import * as entities from './commands/query/entities'
import * as entity from './commands/query/entity'
import * as epoch from './commands/query/epoch'
import * as history from './commands/query/history'
import * as inventory from './commands/query/inventory'
import * as items from './commands/query/items'
import * as location from './commands/query/location'
import * as locationNearby from './commands/query/location-nearby'
import * as modules from './commands/query/modules'
import * as nearby from './commands/query/nearby'
import * as nft from './commands/query/nft'
import * as nftinfo from './commands/query/nftinfo'
import * as player from './commands/query/player'
import * as recipe from './commands/query/recipe'
import * as resources from './commands/query/resources'
import * as gatherable from './commands/query/gatherable'
import * as status from './commands/query/status'
import * as stratum from './commands/query/stratum'
import * as tasks from './commands/query/tasks'
import * as fleetTrack from './commands/query/track'
import * as whoami from './commands/query/whoami'
import * as waitCmd from './commands/wait'
import * as debug from './commands/debug'
import * as tools from './commands/tools'
import * as update from './commands/update'
import * as oracle from './commands/oracle'
import * as msig from './commands/msig'
import * as admin from './commands/admin'
import {ALL_ENTITY_TYPES, parseEntityType} from './lib/args'
import {registerCoordSubcommand} from './lib/coord-scope'
import {
    buildEntityParent,
    buildGenericEntityParent,
    registerEntitySubcommand,
} from './lib/entity-scope'
import {errorOrigin, printError} from './lib/errors'

const PACKAGE = {
    name: 'shiploadcli',
    version: pkg.version,
    description: 'Shipload game CLI — query state and submit actions',
}

export function build(): Command {
    const program = new Command()
    program.name(PACKAGE.name).version(PACKAGE.version).description(PACKAGE.description)
    program.option('--debug', 'show full error details including stack traces')

    program.addHelpText(
        'before',
        [
            'Shipload CLI — query state and submit actions.',
            '',
            'First time?  Run: shiploadcli foundcompany "<name>" && shiploadcli join',
            '',
            'Commands are grouped as: Query (read-only), Action (transacting), Tools (diagnostics).',
            '',
        ].join('\n')
    )

    init.register(program)
    update.register(program)
    whoami.register(program)
    status.register(program)
    waitCmd.register(program)
    epoch.register(program)
    player.register(program)
    buildGenericEntityParent(program, parseEntityType, entity.defaultShow)
    for (const type of ALL_ENTITY_TYPES) {
        buildEntityParent(program, type, entity.defaultShow)
    }
    registerEntitySubcommand(entity.SUBCOMMAND)
    entities.register(program)
    fleetTrack.register(program)
    history.register(program)
    registerEntitySubcommand(history.SUBCOMMAND)
    location.register(program)
    registerCoordSubcommand(locationNearby.SUBCOMMAND)
    registerEntitySubcommand(nearby.SUBCOMMAND)
    registerEntitySubcommand(gatherable.SUBCOMMAND)
    items.register(program)
    recipe.register(program)
    config.register(program)
    resources.register(program)
    modules.register(program)
    nftinfo.register(program)
    nft.register(program)
    stratum.register(program)
    registerEntitySubcommand(inventory.SUBCOMMAND)
    registerEntitySubcommand(inventory.SUBCOMMAND_CARGO_ALIAS)
    registerEntitySubcommand(tasks.SUBCOMMAND)

    foundcompany.register(program)
    join.register(program)
    registerEntitySubcommand(travel.SUBCOMMAND)
    grouptravel.register(program)
    route.register(program)
    registerEntitySubcommand(warp.SUBCOMMAND)
    registerEntitySubcommand(gather.SUBCOMMAND)
    registerEntitySubcommand(transfer.SUBCOMMAND)
    registerEntitySubcommand(recharge.SUBCOMMAND)
    registerEntitySubcommand(craft.SUBCOMMAND)
    registerEntitySubcommand(blend.SUBCOMMAND)
    registerEntitySubcommand(deploy.SUBCOMMAND)
    registerEntitySubcommand(claimplot.SUBCOMMAND)
    registerEntitySubcommand(buildplot.SUBCOMMAND)
    registerEntitySubcommand(undeploy.SUBCOMMAND)
    registerEntitySubcommand(wrap.SUBCOMMAND)
    registerEntitySubcommand(wrapentity.SUBCOMMAND)
    registerEntitySubcommand(demolish.SUBCOMMAND)
    registerEntitySubcommand(addmodule.SUBCOMMAND)
    registerEntitySubcommand(rmmodule.SUBCOMMAND)
    registerEntitySubcommand(refrshentity.SUBCOMMAND)
    registerEntitySubcommand(refrshentity.SUBCOMMAND_REFRESHENTITY_ALIAS)
    registerEntitySubcommand(resolve.SUBCOMMAND)
    registerEntitySubcommand(cancel.SUBCOMMAND)
    registerEntitySubcommand(wait.SUBCOMMAND)
    registerEntitySubcommand(track.SUBCOMMAND)

    tools.register(program)
    debug.register(program)
    oracle.register(program)
    msig.register(program)
    admin.register(program)

    return program
}

export async function run(argv: string[] = process.argv): Promise<void> {
    const program = build()
    try {
        await program.parseAsync(argv)
    } catch (err) {
        if (program.opts().debug) {
            console.error(`[${errorOrigin(err)}]`, err)
            process.exit(1)
        }
        process.exit(printError(err))
    }
    if (argv.slice(2).length === 0) {
        program.outputHelp()
    }
}
