import {
    CAP_MODULES,
    cargoRef,
    getItem,
    type Item,
    kindCan,
    resolveItem,
    type ServerTypes,
    type Shipload,
} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command, Option} from 'commander'
import {type EntityTypeName, parseCargoRef, type ParsedCargoRef, parseUint8} from '../../lib/args'
import {parseModulesJson, validateTargetTriple} from '../../lib/cargo-build'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {checkResolveEntity} from '../../lib/resolve-prompt'
import {transact} from '../../lib/session'
import {type EntitySnapshot, getEntitySnapshot} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'

export interface AddModuleOpts {
    entityType: EntityTypeName
    entityId: bigint
    moduleIndex: number
    moduleItemId: bigint
    moduleStats: bigint
    moduleModules?: ServerTypes.module_entry[]
    targetItemId?: bigint
    targetStats?: bigint
    targetModules?: ServerTypes.module_entry[]
}

function findCargoEntry(cargo: EntitySnapshot['cargo'], itemId: number, stats: bigint): unknown {
    return (cargo ?? []).find(
        (c) =>
            Number((c.item_id as {toString(): string}).toString()) === itemId &&
            BigInt((c.stats ?? 0n).toString()) === stats
    )
}

export function preflightAgainstSnapshot(snap: EntitySnapshot, opts: AddModuleOpts): void {
    const moduleItemId = Number(opts.moduleItemId)
    const moduleStats = opts.moduleStats
    if (!findCargoEntry(snap.cargo, moduleItemId, moduleStats)) {
        throw new ValidationError(
            `No cargo with item ${moduleItemId} stats ${moduleStats} on ${opts.entityType} ${opts.entityId}.`,
            'Run `<entity> <id> inventory` to see available cargo.'
        )
    }
    let item: Item
    try {
        item = getItem(moduleItemId)
    } catch {
        throw new ValidationError(`Unknown item id ${moduleItemId}.`)
    }
    if (item.type !== 'module') {
        throw new ValidationError(
            `Item ${moduleItemId} is not a module ("${resolveItem(moduleItemId).name}").`,
            'Pass an item id whose type is MODULE.'
        )
    }
    if (opts.targetItemId !== undefined) {
        const targetItemId = Number(opts.targetItemId)
        const targetStats = opts.targetStats!
        if (!findCargoEntry(snap.cargo, targetItemId, targetStats)) {
            throw new ValidationError(
                `No target cargo with item ${targetItemId} stats ${targetStats} on ${opts.entityType} ${opts.entityId}.`
            )
        }
    }
}

export async function preflightAddModule(opts: AddModuleOpts): Promise<void> {
    const snap = await getEntitySnapshot(opts.entityId)
    preflightAgainstSnapshot(snap, opts)
}

export async function buildAction(opts: AddModuleOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    const moduleRef = cargoRef({
        item_id: Number(opts.moduleItemId),
        stats: opts.moduleStats,
        modules: opts.moduleModules ?? [],
    })
    const targetRef =
        opts.targetItemId !== undefined
            ? cargoRef({
                  item_id: Number(opts.targetItemId),
                  stats: opts.targetStats!,
                  modules: opts.targetModules ?? [],
              })
            : null
    return sl.actions.addmodule(opts.entityId, opts.moduleIndex, moduleRef, targetRef)
}

interface AddModuleCliOptions {
    modules?: string
    target?: ParsedCargoRef
    targetModules?: string
    autoResolve?: boolean
}

export async function runAddModule(
    ctx: EntityContext,
    moduleIndex: number,
    moduleRef: ParsedCargoRef,
    options: AddModuleCliOptions
): Promise<void> {
    const addOpts: AddModuleOpts = {
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        moduleIndex,
        moduleItemId: BigInt(moduleRef.itemId),
        moduleStats: moduleRef.stackId,
        moduleModules: parseModulesJson(options.modules),
        targetItemId: options.target !== undefined ? BigInt(options.target.itemId) : undefined,
        targetStats: options.target?.stackId,
        targetModules:
            options.target !== undefined ? parseModulesJson(options.targetModules) : undefined,
    }
    await withValidation(async () => {
        validateTargetTriple({
            targetItemId: addOpts.targetItemId,
            targetStats: addOpts.targetStats,
            targetModules: options.targetModules,
        })
        await checkResolveEntity(ctx.entityId, Boolean(options.autoResolve))
        await preflightAddModule(addOpts)
    })
    const action = await buildAction(addOpts)
    await transact(
        {action},
        {
            description: `Adding module item ${moduleRef.itemId} stats ${moduleRef.stackId} to ${ctx.entityType}:${ctx.entityId} slot ${moduleIndex}`,
        }
    )
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'addmodule',
    description: 'Attach a module cargo to the entity',
    appliesTo: (kind) => kindCan(kind, CAP_MODULES),
    build: (ctx) =>
        new Command('addmodule')
            .description('Attach a module cargo to the entity')
            .addHelpText(
                'before',
                'Requires: entity idle; module cargo present in cargo. ' +
                    'Module slots are 0-indexed; run `<entity-type> <id>` to see the slot map. ' +
                    'Identify the module by <item-id>:<stack-id>; pass --modules if the module itself is a packed entity.\n' +
                    'Default behavior installs onto the live entity. Pass --target <item-id>:<stack-id> to install onto a packed-entity cargo instead.\n'
            )
            .argument('<module-index>', 'module slot index (0-indexed)', parseUint8)
            .argument('<module>', '<item-id>:<stack-id> — module cargo to install.', parseCargoRef)
            .addOption(
                new Option(
                    '--modules <json>',
                    "modules vector for the module's own cargo entry (JSON array, default [])"
                )
            )
            .addOption(
                new Option(
                    '--target <item-id>:<stack-id>',
                    'target packed-cargo to install into'
                ).argParser(parseCargoRef)
            )
            .addOption(
                new Option(
                    '--target-modules <json>',
                    'target packed-cargo modules vector (JSON array, default [])'
                )
            )
            .option('--auto-resolve', 'resolve completed tasks on the target entity before acting')
            .action(
                async (
                    moduleIndex: number,
                    moduleRef: ParsedCargoRef,
                    opts: AddModuleCliOptions
                ) => {
                    await runAddModule(ctx, moduleIndex, moduleRef, opts)
                }
            ),
}
