import type {Action} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {parseInt64, parseUint16, parseUint32, parseUint64} from '../../lib/args'
import {formatItem} from '../../lib/format'
import {transact} from '../../lib/session'
import {
    accumulateModules,
    buildCredit,
    buildGrant,
    buildMove,
    buildRemove,
    buildResolve,
    buildSpawn,
    DEFAULT_STAT,
    defaultContext,
    type ModuleSpec,
    parseEnergy,
    parseInfluence,
    parseStats,
} from './acts'
import {requireSandbox} from './guard'

const SANDBOX_ONLY =
    'Sandbox only: needs a profile whose game contract is a Sandbox server (box.shipload). Against the live game it refuses before signing.'

async function send(build: () => Action, description: string): Promise<void> {
    await requireSandbox()
    await transact({action: build()}, {description})
}

function before(...lines: string[]): string {
    return [SANDBOX_ONLY, ...lines, ''].join('\n')
}

const STATS_HELP = `stats as comma-separated values 0–999, one per stat (default: ${DEFAULT_STAT} each)`
const MODULE_HELP =
    'install a module as <slot>:<item-id>[:<stats>], e.g. 0:10100 or 0:10100:800,800 (repeatable)'

export function register(program: Command): void {
    const sandbox = program
        .command('sandbox')
        .description(
            'Sandbox acts: spawn, grant, move, remove, credit, resolve (Sandbox profile only)'
        )
        .addHelpText(
            'before',
            [
                SANDBOX_ONLY,
                'Each act is signed by your configured account and only touches entities it owns.',
                'Select a Sandbox profile with PLAYER_CONFIG; config.sandbox.ini.example shows one.',
                '',
            ].join('\n')
        )

    sandbox
        .command('spawn')
        .description('Create a ship or container you own at a coordinate')
        .argument('<item-id>', 'ship or container item id', parseUint16)
        .argument('<x>', 'x coordinate', parseInt64)
        .argument('<y>', 'y coordinate', parseInt64)
        .option('--stats <list>', STATS_HELP, parseStats)
        .option('--module <spec>', MODULE_HELP, accumulateModules)
        .option(
            '--energy <n>',
            'starting energy, capped at the generator capacity (default: full)',
            parseEnergy
        )
        .addHelpText(
            'before',
            before(
                'Structures cannot be spawned: grant their kit with `sandbox grant` and place it with `deploy`.'
            )
        )
        .addHelpText(
            'after',
            `
Examples:
  shiploadcli sandbox spawn 10201 3 2
  shiploadcli sandbox spawn 10201 3 2 --module 0:10100 --energy 0`
        )
        .action(
            async (
                itemId: number,
                x: bigint,
                y: bigint,
                opts: {stats?: number[]; module?: ModuleSpec[]; energy?: number}
            ) => {
                await send(
                    () =>
                        buildSpawn(defaultContext(), {
                            itemId,
                            x,
                            y,
                            stats: opts.stats,
                            modules: opts.module,
                            energy: opts.energy,
                        }),
                    `Spawning ${formatItem(itemId)} at (${x}, ${y})`
                )
            }
        )

    sandbox
        .command('grant')
        .description('Add items to an idle ship or container you own')
        .argument('<entity-id>', 'ship or container id', parseUint64)
        .argument('<item-id>', 'item to add', parseUint16)
        .argument('<quantity>', 'how many to add', parseUint32)
        .option('--stats <list>', STATS_HELP, parseStats)
        .option('--module <spec>', `${MODULE_HELP}; entity kits only`, accumulateModules)
        .addHelpText(
            'before',
            before('Requires: the entity is idle and its hold has room for the items.')
        )
        .addHelpText(
            'after',
            `
Examples:
  shiploadcli sandbox grant 42 10001 500
  shiploadcli sandbox grant 42 10208 1 --stats 900,900,900`
        )
        .action(
            async (
                entityId: bigint,
                itemId: number,
                quantity: number,
                opts: {stats?: number[]; module?: ModuleSpec[]}
            ) => {
                await send(
                    () =>
                        buildGrant(defaultContext(), {
                            entityId,
                            itemId,
                            quantity,
                            stats: opts.stats,
                            modules: opts.module,
                        }),
                    `Granting ${quantity} × ${formatItem(itemId)} to entity ${entityId}`
                )
            }
        )

    sandbox
        .command('move')
        .description('Teleport an idle ship or container you own')
        .argument('<entity-id>', 'ship or container id', parseUint64)
        .argument('<x>', 'destination x coordinate', parseInt64)
        .argument('<y>', 'destination y coordinate', parseInt64)
        .addHelpText('before', before('Requires: the entity is idle. Altitude is kept.'))
        .addHelpText('after', '\nExample:\n  shiploadcli sandbox move 42 10 -4')
        .action(async (entityId: bigint, x: bigint, y: bigint) => {
            await send(
                () => buildMove(defaultContext(), entityId, x, y),
                `Moving entity ${entityId} to (${x}, ${y})`
            )
        })

    sandbox
        .command('remove')
        .description('Delete an idle ship or container you own, with its cargo')
        .argument('<entity-id>', 'ship or container id', parseUint64)
        .addHelpText(
            'before',
            before(
                'Requires: the entity is idle. Its RAM is refunded. Structures leave through `demolish` or `undeploy`.'
            )
        )
        .addHelpText('after', '\nExample:\n  shiploadcli sandbox remove 42')
        .action(async (entityId: bigint) => {
            await send(() => buildRemove(defaultContext(), entityId), `Removing entity ${entityId}`)
        })

    sandbox
        .command('credit')
        .description('Credit your influence at a World')
        .argument('<x>', 'World x coordinate', parseInt64)
        .argument('<y>', 'World y coordinate', parseInt64)
        .argument('<amount>', 'influence to credit, in whole points', parseInfluence)
        .option('--node <id>', 'charter node to credit toward', parseUint32)
        .addHelpText('before', before('Requires: a World at the coordinate.'))
        .addHelpText(
            'after',
            '\nExamples:\n  shiploadcli sandbox credit 0 0 5\n  shiploadcli sandbox credit 0 0 5 --node 3'
        )
        .action(async (x: bigint, y: bigint, amount: bigint, opts: {node?: number}) => {
            await send(
                () => buildCredit(defaultContext(), x, y, amount, opts.node),
                `Crediting ${amount} influence at (${x}, ${y})`
            )
        })

    sandbox
        .command('resolve')
        .description("Finish an entity's scheduled tasks now")
        .argument('<entity-id>', 'entity id', parseUint64)
        .option(
            '--count <n>',
            'finish only the first n tasks in completion order (default: all)',
            parseUint64
        )
        .addHelpText(
            'before',
            before(
                'Moves the schedules of the entity and everything linked to it earlier, then resolves them.',
                'Requires: scheduled tasks, and every linked entity owned by you.'
            )
        )
        .addHelpText(
            'after',
            '\nExamples:\n  shiploadcli sandbox resolve 42\n  shiploadcli sandbox resolve 42 --count 1'
        )
        .action(async (entityId: bigint, opts: {count?: bigint}) => {
            await send(
                () => buildResolve(defaultContext(), entityId, opts.count),
                `Finishing tasks for entity ${entityId}`
            )
        })
}
