import {cargoRef, getItem, type Item, resolveItem, type Shipload} from '@shipload/sdk'
import {type Action, Name} from '@wharfkit/antelope'
import {Command, Option} from 'commander'
import {type EntityTypeName, parseUint32, parseUint64} from '../../lib/args'
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
    moduleModules?: unknown[]
    targetItemId?: bigint
    targetStats?: bigint
    targetModules?: unknown[]
}

export function preflightAgainstSnapshot(snap: EntitySnapshot, opts: AddModuleOpts): void {
    const cargo = snap.cargo ?? []
    const moduleItemId = Number(opts.moduleItemId)
    const moduleStats = opts.moduleStats
    const matchingModule = cargo.find(
        (c) =>
            Number((c.item_id as {toString(): string}).toString()) === moduleItemId &&
            BigInt((c.stats ?? 0n).toString()) === moduleStats
    )
    if (!matchingModule) {
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
        const matchingTarget = cargo.find(
            (c) =>
                Number((c.item_id as {toString(): string}).toString()) === targetItemId &&
                BigInt((c.stats ?? 0n).toString()) === targetStats
        )
        if (!matchingTarget) {
            throw new ValidationError(
                `No target cargo with item ${targetItemId} stats ${targetStats} on ${opts.entityType} ${opts.entityId}.`
            )
        }
    }
}

export async function preflightAddModule(opts: AddModuleOpts): Promise<void> {
    const snap = await getEntitySnapshot(opts.entityType, opts.entityId)
    preflightAgainstSnapshot(snap, opts)
}

export async function buildAction(opts: AddModuleOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    const moduleRef = cargoRef({
        item_id: Number(opts.moduleItemId),
        stats: opts.moduleStats,
        modules: (opts.moduleModules ?? []) as never,
    })
    const targetRef =
        opts.targetItemId !== undefined
            ? cargoRef({
                  item_id: Number(opts.targetItemId),
                  stats: opts.targetStats!,
                  modules: (opts.targetModules ?? []) as never,
              })
            : null
    return sl.actions.addmodule(
        Name.from(opts.entityType),
        opts.entityId,
        opts.moduleIndex,
        moduleRef,
        targetRef
    )
}

interface AddModuleCliOptions {
    modules?: string
    targetItemId?: bigint
    targetStats?: bigint
    targetModules?: string
    autoResolve?: boolean
}

function validateTargetTriple(opts: AddModuleCliOptions): void {
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

export async function runAddModule(
    ctx: EntityContext,
    moduleIndex: number,
    moduleItemId: bigint,
    moduleStats: bigint,
    options: AddModuleCliOptions
): Promise<void> {
    await withValidation(async () => {
        validateTargetTriple(options)
    })
    const moduleModules = options.modules ? JSON.parse(options.modules) : []
    const targetModules = options.targetModules ? JSON.parse(options.targetModules) : []
    const addOpts: AddModuleOpts = {
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        moduleIndex,
        moduleItemId,
        moduleStats,
        moduleModules,
        targetItemId: options.targetItemId,
        targetStats: options.targetStats,
        targetModules: options.targetItemId !== undefined ? targetModules : undefined,
    }
    await withValidation(async () => {
        await checkResolveEntity(ctx.entityType, ctx.entityId, Boolean(options.autoResolve))
        await preflightAddModule(addOpts)
    })
    const action = await buildAction(addOpts)
    await transact(
        {action},
        {
            description: `Adding module item ${moduleItemId} stats ${moduleStats} to ${ctx.entityType}:${ctx.entityId} slot ${moduleIndex}`,
        }
    )
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'addmodule',
    description: 'Attach a module cargo to the ship',
    appliesTo: ['ship'],
    build: (ctx) =>
        new Command('addmodule')
            .description('Attach a module cargo to the ship')
            .addHelpText(
                'before',
                'Requires: ship idle; module cargo present in cargo. ' +
                    'Identify the module by (item-id, stats); pass --modules if the module itself is a packed entity.\n' +
                    'Default behavior installs onto the live ship. Pass --target-item-id and --target-stats to install onto a packed-entity cargo instead.\n'
            )
            .argument('<module-index>', 'module slot index', parseUint32)
            .argument('<module-item-id>', 'item id of the module to install', parseUint64)
            .argument('<module-stats>', 'stats of the module to install', parseUint64)
            .addOption(
                new Option(
                    '--modules <json>',
                    "modules vector for the module's own cargo entry (JSON array, default [])"
                )
            )
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
            .action(
                async (
                    moduleIndex: number,
                    moduleItemId: bigint,
                    moduleStats: bigint,
                    opts: AddModuleCliOptions
                ) => {
                    await runAddModule(ctx, moduleIndex, moduleItemId, moduleStats, opts)
                }
            ),
}
