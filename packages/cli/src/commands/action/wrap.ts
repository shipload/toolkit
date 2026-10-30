import {cargoModulesKey, ServerTypes, type Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command, Option} from 'commander'
import {ALL_ENTITY_TYPES, type ParsedCargoRef, parseCargoRef, parseUint64} from '../../lib/args'
import {parseModulesJson} from '../../lib/cargo-build'
import {formatCargoRef, safeItemName} from '../../lib/cargo-table'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {transact} from '../../lib/session'
import {withValidation} from '../../lib/errors'
import {type EntitySnapshot, getEntitySnapshot} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export interface WrapOpts {
    owner: string
    entityId: bigint
    nexusId: bigint
    stack: ServerTypes.cargo_item
    claimRam?: boolean
}

export async function buildAction(opts: WrapOpts, shipload?: Shipload): Promise<Action[]> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.wrap(opts.owner, opts.entityId, opts.nexusId, opts.stack, {
        claimRam: opts.claimRam,
    })
}

interface WrapCliOptions {
    wait?: boolean
    track?: boolean
    claimRam?: boolean
    entityId?: bigint
    modules?: string
}

type SnapshotStack = EntitySnapshot['cargo'][number]

function installedKey(modules: readonly unknown[] | undefined): string {
    return cargoModulesKey((modules ?? []) as ServerTypes.module_entry[])
}

function describeStack(c: SnapshotStack): string {
    const installed = installedKey(c.modules) || 'none'
    const seq = c.entity_id ? `, sequence id ${c.entity_id}` : ''
    return `  ${c.quantity}× ${safeItemName(Number(c.item_id))} (installed ${installed}${seq})`
}

export function selectStack(
    cargo: EntitySnapshot['cargo'],
    ref: ParsedCargoRef,
    quantity: bigint,
    sequenceId?: bigint,
    modules?: ServerTypes.module_entry[]
): ServerTypes.cargo_item {
    const label = formatCargoRef(ref.itemId, ref.stackId)
    let matches = cargo.filter(
        (c) => Number(c.item_id) === ref.itemId && (c.stats ?? 0n) === ref.stackId
    )
    if (matches.length === 0) {
        throw new ValidationError(
            `No cargo matches ${label}.`,
            'Run `<entity-type> <id> inventory` to see available cargo.'
        )
    }
    if (sequenceId !== undefined) {
        matches = matches.filter((c) => (c.entity_id ?? 0n) === sequenceId)
        if (matches.length === 0) {
            throw new ValidationError(`No cargo matches ${label} with sequence id ${sequenceId}.`)
        }
    }
    if (modules !== undefined) {
        const wanted = installedKey(modules)
        matches = matches.filter((c) => installedKey(c.modules) === wanted)
        if (matches.length === 0) {
            throw new ValidationError(
                `No cargo matches ${label} with installed modules ${wanted || 'none'}.`
            )
        }
    }
    if (matches.length > 1) {
        throw new ValidationError(
            `More than one cargo stack matches ${label}:\n${matches.map(describeStack).join('\n')}`,
            'Pass --modules <json> or --entity-id <sequence-id> to choose one.'
        )
    }
    const stack = matches[0]
    if (quantity > stack.quantity) {
        throw new ValidationError(
            `Cargo has ${stack.quantity}× ${label}, requested ${quantity}.`,
            'Reduce the quantity.'
        )
    }
    return ServerTypes.cargo_item.from({
        item_id: stack.item_id,
        stats: stack.stats ?? 0n,
        modules: (stack.modules ?? []) as ServerTypes.module_entry[],
        quantity,
        entity_id: stack.entity_id ? stack.entity_id : undefined,
    })
}

export async function runWrap(
    ctx: EntityContext,
    owner: string,
    nexusId: bigint,
    ref: ParsedCargoRef,
    quantity: bigint,
    options: WrapCliOptions
): Promise<void> {
    const actions = await withValidation(async () => {
        const snap = await getEntitySnapshot(ctx.entityId)
        const modules =
            options.modules === undefined ? undefined : parseModulesJson(options.modules)
        const stack = selectStack(snap.cargo, ref, quantity, options.entityId, modules)
        return buildAction({
            owner,
            entityId: ctx.entityId,
            nexusId,
            stack,
            claimRam: options.claimRam,
        })
    })
    const label = formatCargoRef(ref.itemId, ref.stackId)
    const result = await transact(
        {actions},
        {
            description: `Wrapping ${quantity} of ${label} for ${owner}`,
            errorHint: (msg) => {
                if (
                    !msg.includes('cargo') &&
                    !msg.includes('nexus') &&
                    !msg.includes('wrap') &&
                    !msg.includes('quantity')
                ) {
                    return undefined
                }
                return `tried to wrap ${quantity}× ${label} for ${owner} at nexus ${nexusId}`
            },
        }
    )
    await maybeAwaitAndPrint(ctx.entityId, options, result)
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'wrap',
    description: 'Wrap cargo into a wrapped item for the specified owner',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('wrap')
            .description('Wrap cargo into a wrapped item for the specified owner')
            .addHelpText(
                'before',
                'Requires: deployed entity at a nexus with loaders; caller owns the entity.\n' +
                    'Cargo is identified by <item-id>:<stack-id>. Mints instantly.\n'
            )
            .addHelpText(
                'after',
                `
Example:
  # Wrap 5 units of item 301 (stack 214202522) into a wrapped item for alice at nexus 3
  shiploadcli ship 1 wrap alice 3 301:214202522 5

Use \`shiploadcli ship N inventory\` to list item ids and stack ids.`
            )
            .argument('<owner>', 'recipient account name')
            .argument(
                '<nexus-id>',
                'nexus entity id where the wrapping entity is located',
                parseUint64
            )
            .argument('<cargo>', '<item-id>:<stack-id> of the cargo to wrap', parseCargoRef)
            .argument('<quantity>', 'amount to wrap', parseUint64)
            .addOption(
                new Option(
                    '--entity-id <sequence-id>',
                    'sequence id of the stack, to choose between stacks with the same item and stats'
                ).argParser(parseUint64)
            )
            .addOption(
                new Option(
                    '--modules <json>',
                    'modules vector of the stack, to choose between stacks that differ only by installed modules (JSON array)'
                )
            )
            .option(
                '--claim-ram',
                'Force-bundle the atomicassets setlastpayer RAM claim into the wrap (on by default when the configured atomicassets account is non-canonical)'
            )
            .option(
                '--no-claim-ram',
                'Skip the bundled setlastpayer RAM claim, leaving the wrap gate set until the wrapped item is consumed or burned'
            )
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(
                async (
                    owner: string,
                    nexusId: bigint,
                    cargo: ParsedCargoRef,
                    quantity: bigint,
                    opts: WrapCliOptions
                ) => {
                    await runWrap(ctx, owner, nexusId, cargo, quantity, opts)
                }
            ),
}
