import {cargoRef, type ServerTypes, type Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command, Option} from 'commander'
import {
    ALL_ENTITY_TYPES,
    type EntityTypeName,
    parseCargoRef,
    type ParsedCargoRef,
    parseUint8,
} from '../../lib/args'
import {parseModulesJson, validateTargetTriple} from '../../lib/cargo-build'
import {formatCargoRef} from '../../lib/cargo-table'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {bundleWithIdleResolve} from '../../lib/resolve-prompt'
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
    return sl.actions.rmmodule(opts.entityId, opts.moduleIndex, targetRef)
}

interface RmModuleCliOptions {
    target?: ParsedCargoRef
    targetModules?: string
    autoResolve?: boolean
}

export async function runRmModule(
    ctx: EntityContext,
    moduleIndex: number,
    options: RmModuleCliOptions
): Promise<void> {
    const targetItemId = options.target !== undefined ? BigInt(options.target.itemId) : undefined
    const targetStats = options.target?.stackId
    const actions = await withValidation(async () => {
        validateTargetTriple({
            targetItemId,
            targetStats,
            targetModules: options.targetModules,
        })
        const action = await buildAction({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            moduleIndex,
            targetItemId,
            targetStats,
            targetModules:
                targetItemId !== undefined ? parseModulesJson(options.targetModules) : undefined,
        })
        return bundleWithIdleResolve(ctx.entityId, action, Boolean(options.autoResolve))
    })
    await transact(
        {actions},
        {
            description:
                `Removing module from ${ctx.entityType}:${ctx.entityId} slot ${moduleIndex}` +
                (targetItemId !== undefined
                    ? ` (packed in cargo item ${targetItemId} stats ${targetStats})`
                    : ''),
            errorHint: () => {
                const base = `tried to remove module from slot ${moduleIndex} on ${ctx.entityType}:${ctx.entityId}`
                if (options.target !== undefined) {
                    return `${base} → packed cargo: ${formatCargoRef(options.target.itemId, options.target.stackId)}`
                }
                return base
            },
        }
    )
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'rmmodule',
    description: 'Remove a module from the entity',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('rmmodule')
            .description('Remove a module from the entity')
            .addHelpText(
                'before',
                'Requires: entity idle; module slot occupied. ' +
                    'Module slots are 0-indexed; run `<entity-type> <id>` to see the slot map. ' +
                    'Default removes from the live entity. Pass --target <item-id>:<stack-id> to remove from a packed-entity cargo instead.\n'
            )
            .argument('<module-index>', 'module slot index (0-indexed)', parseUint8)
            .addOption(
                new Option(
                    '--target <item-id>:<stack-id>',
                    'target packed-cargo to remove from'
                ).argParser(parseCargoRef)
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
