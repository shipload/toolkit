import {cargoRef, type Shipload} from '@shipload/sdk'
import {type Action, Name} from '@wharfkit/antelope'
import {Command, Option} from 'commander'
import {type EntityTypeName, parseUint32, parseUint64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {checkResolveEntity} from '../../lib/resolve-prompt'
import {transact} from '../../lib/session'
import {ValidationError} from '../../lib/validate'

export interface RmModuleOpts {
    entityType: EntityTypeName
    entityId: bigint
    moduleIndex: number
    targetItemId?: bigint
    targetStats?: bigint
    targetModules?: unknown[]
}

export async function buildAction(opts: RmModuleOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    const targetRef =
        opts.targetItemId !== undefined
            ? cargoRef({
                  item_id: Number(opts.targetItemId),
                  stats: opts.targetStats!,
                  modules: (opts.targetModules ?? []) as never,
              })
            : null
    return sl.actions.rmmodule(
        Name.from(opts.entityType),
        opts.entityId,
        opts.moduleIndex,
        targetRef
    )
}

interface RmModuleCliOptions {
    targetItemId?: bigint
    targetStats?: bigint
    targetModules?: string
    autoResolve?: boolean
}

function validateTargetTriple(opts: RmModuleCliOptions): void {
    const present = [
        opts.targetItemId !== undefined,
        opts.targetStats !== undefined,
        opts.targetModules !== undefined,
    ]
    const someButNotAll =
        present.some((p) => p) && !(opts.targetItemId !== undefined && opts.targetStats !== undefined)
    if (someButNotAll) {
        throw new ValidationError(
            '--target-item-id and --target-stats must be provided together (--target-modules is optional, defaults to []).'
        )
    }
}

export async function runRmModule(
    ctx: EntityContext,
    moduleIndex: number,
    options: RmModuleCliOptions
): Promise<void> {
    await withValidation(() => {
        validateTargetTriple(options)
        return checkResolveEntity(ctx.entityType, ctx.entityId, Boolean(options.autoResolve))
    })
    const targetModules = options.targetModules ? JSON.parse(options.targetModules) : []
    const action = await buildAction({
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        moduleIndex,
        targetItemId: options.targetItemId,
        targetStats: options.targetStats,
        targetModules: options.targetItemId !== undefined ? targetModules : undefined,
    })
    await transact(
        {action},
        {
            description:
                `Removing module from ${ctx.entityType}:${ctx.entityId} slot ${moduleIndex}` +
                (options.targetItemId !== undefined
                    ? ` (packed in cargo item ${options.targetItemId} stats ${options.targetStats})`
                    : ''),
        }
    )
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'rmmodule',
    description: 'Remove a module from the ship',
    appliesTo: ['ship'],
    build: (ctx) =>
        new Command('rmmodule')
            .description('Remove a module from the ship')
            .addHelpText(
                'before',
                'Requires: ship idle; module slot occupied. ' +
                    'Default removes from the live ship. Pass --target-item-id and --target-stats to remove from a packed-entity cargo instead.\n'
            )
            .argument('<module-index>', 'module slot index', parseUint32)
            .addOption(
                new Option('--target-item-id <id>', 'target packed-cargo item id').argParser(
                    parseUint64
                )
            )
            .addOption(
                new Option('--target-stats <stats>', 'target packed-cargo stats').argParser(
                    parseUint64
                )
            )
            .addOption(
                new Option(
                    '--target-modules <json>',
                    'target packed-cargo modules vector (JSON array, default [])'
                )
            )
            .option('--auto-resolve', 'resolve completed tasks on the target entity before acting')
            .action(async (moduleIndex: number, opts: RmModuleCliOptions) => {
                await runRmModule(ctx, moduleIndex, opts)
            }),
}
