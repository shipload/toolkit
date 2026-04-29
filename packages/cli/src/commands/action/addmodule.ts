import {getItem, type Item, resolveItem} from '@shipload/sdk'
import {type Action, Name} from '@wharfkit/antelope'
import {Command} from 'commander'
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
    moduleCargoId: bigint
    targetCargoId: bigint
}

function rowIdOf(c: {id?: unknown}): bigint {
    if (c.id === undefined || c.id === null) return 0n
    return BigInt((c.id as {toString(): string}).toString())
}

export function preflightAgainstSnapshot(snap: EntitySnapshot, opts: AddModuleOpts): void {
    const cargo = snap.cargo ?? []
    const row = cargo.find((c) => rowIdOf(c) === opts.moduleCargoId)
    if (!row) {
        throw new ValidationError(
            `No cargo row ${opts.moduleCargoId} on ${opts.entityType} ${opts.entityId}.`,
            'Run `<entity> <id> inventory` to see row ids in the Row ID column.'
        )
    }
    const itemId = Number((row.item_id as {toString(): string}).toString())
    let item: Item
    try {
        item = getItem(itemId)
    } catch {
        throw new ValidationError(
            `Cargo row ${opts.moduleCargoId} references unknown item ${itemId}.`
        )
    }
    if (item.type !== 'module') {
        throw new ValidationError(
            `Cargo row ${opts.moduleCargoId} is not a module (item ${itemId} is "${resolveItem(itemId).name}").`,
            'Pass the row id of a module cargo (item type=MODULE).'
        )
    }
    if (opts.targetCargoId !== 0n) {
        const target = cargo.find((c) => rowIdOf(c) === opts.targetCargoId)
        if (!target) {
            throw new ValidationError(
                `No target cargo row ${opts.targetCargoId} on ${opts.entityType} ${opts.entityId}.`
            )
        }
    }
}

export async function preflightAddModule(opts: AddModuleOpts): Promise<void> {
    const snap = await getEntitySnapshot(opts.entityType, opts.entityId)
    preflightAgainstSnapshot(snap, opts)
}

export async function buildAction(opts: AddModuleOpts): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.addmodule(
        Name.from(opts.entityType),
        opts.entityId,
        opts.moduleIndex,
        opts.moduleCargoId,
        opts.targetCargoId
    )
}

interface AddModuleCliOptions {
    target?: bigint
    autoResolve?: boolean
}

export async function runAddModule(
    ctx: EntityContext,
    moduleIndex: number,
    moduleCargoId: bigint,
    options: AddModuleCliOptions
): Promise<void> {
    const addOpts: AddModuleOpts = {
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        moduleIndex,
        moduleCargoId,
        targetCargoId: options.target ?? 0n,
    }
    await withValidation(async () => {
        await checkResolveEntity(ctx.entityType, ctx.entityId, Boolean(options.autoResolve))
        await preflightAddModule(addOpts)
    })
    const action = await buildAction(addOpts)
    await transact(
        {action},
        {
            description: `Adding module from cargo row ${moduleCargoId} to ${ctx.entityType}:${ctx.entityId} slot ${moduleIndex}`,
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
                    'Both ids are cargo-table row ids — use the "Row ID" column from `inventory`.\n'
            )
            .argument('<module-index>', 'module slot index', parseUint32)
            .argument(
                '<module-cargo-row-id>',
                'cargo row id of the module to install (Row ID from `inventory`)',
                parseUint64
            )
            .option(
                '--target <row-id>',
                'cargo row id of a packed-entity cargo to install the module into (default 0 = the live entity itself)',
                parseUint64
            )
            .option('--auto-resolve', 'resolve completed tasks on the target entity before acting')
            .action(
                async (moduleIndex: number, moduleCargoId: bigint, opts: AddModuleCliOptions) => {
                    await runAddModule(ctx, moduleIndex, moduleCargoId, opts)
                }
            ),
}
