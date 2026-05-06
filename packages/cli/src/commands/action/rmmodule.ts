import {cargoRef, type ServerTypes, type Shipload} from '@shipload/sdk'
import {type Action, Name} from '@wharfkit/antelope'
import {Command, Option} from 'commander'
import {type EntityTypeName, parseUint8, parseUint64} from '../../lib/args'
import {parseModulesJson, validateTargetTriple} from '../../lib/cargo-build'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {checkResolveEntity} from '../../lib/resolve-prompt'
import {transact} from '../../lib/session'

export interface RmModuleOpts {
    entityType: EntityTypeName
    entityId: bigint
    moduleIndex: number
    targetItemId?: bigint
    targetStats?: bigint
    targetModules?: ServerTypes.module_entry[]
}

export async function buildAction(opts: RmModuleOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    const targetRef =
        opts.targetItemId !== undefined
            ? cargoRef({
                  item_id: Number(opts.targetItemId),
                  stats: opts.targetStats!,
                  modules: opts.targetModules ?? [],
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

export async function runRmModule(
    ctx: EntityContext,
    moduleIndex: number,
    options: RmModuleCliOptions
): Promise<void> {
    await withValidation(async () => {
        validateTargetTriple(options)
        await checkResolveEntity(ctx.entityType, ctx.entityId, Boolean(options.autoResolve))
    })
    const action = await buildAction({
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        moduleIndex,
        targetItemId: options.targetItemId,
        targetStats: options.targetStats,
        targetModules:
            options.targetItemId !== undefined
                ? parseModulesJson(options.targetModules)
                : undefined,
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
    description: 'Remove a module from the entity',
    appliesTo: (traits) => traits.hasModules,
    build: (ctx) =>
        new Command('rmmodule')
            .description('Remove a module from the entity')
            .addHelpText(
                'before',
                'Requires: entity idle; module slot occupied. ' +
                    'Module slots are 0-indexed; run `<entity-type> <id>` to see the slot map. ' +
                    'Default removes from the live entity. Pass --target-item-id and --target-stats to remove from a packed-entity cargo instead.\n'
            )
            .argument('<module-index>', 'module slot index (0-indexed)', parseUint8)
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
