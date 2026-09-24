import {ServerTypes, type Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {
    accumulateCargoInputs,
    ALL_ENTITY_TYPES,
    type EntityTypeName,
    parseUint16,
    parseUint32,
    parseUint64,
} from '../../lib/args'
import {projectCargoFromSnapshot} from '../../lib/cargo-projection'
import {
    type ParsedCargoInput,
    type ResolvedCargoInput,
    resolveCargoInputs,
} from '../../lib/cargo-resolve'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {transact} from '../../lib/session'
import {getEntitySnapshot} from '../../lib/snapshot'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION, type WaitableOptions} from '../../lib/wait'
import {validateRecipeSlotTotals} from './craft'

export interface CraftjobOpts {
    entityType: EntityTypeName
    entityId: bigint
    workshopId: bigint
    recipeId: number
    quantity: number
    inputs: ResolvedCargoInput[]
    shuttledBy?: bigint
}

export async function buildAction(opts: CraftjobOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    const cargoInputs = opts.inputs.map((i) =>
        ServerTypes.cargo_item.from({
            item_id: i.itemId,
            quantity: i.quantity,
            stats: i.stackId,
            modules: [],
        })
    )
    return sl.actions.craftjob(
        opts.entityId,
        opts.workshopId,
        opts.recipeId,
        opts.quantity,
        cargoInputs,
        opts.shuttledBy
    )
}

export interface CraftjobCliOptions extends WaitableOptions {
    shuttledBy?: bigint
}

export async function runCraftjob(
    ctx: EntityContext,
    workshopId: bigint,
    recipeId: number,
    quantity: number,
    inputs: ParsedCargoInput[],
    options: CraftjobCliOptions
): Promise<void> {
    await withValidation(async () => {
        const snap = await getEntitySnapshot(ctx.entityId)
        const resolved = resolveCargoInputs(
            inputs,
            projectCargoFromSnapshot(snap) as unknown as ServerTypes.cargo_item[]
        )
        await validateRecipeSlotTotals(recipeId, quantity, resolved)
        const action = await buildAction({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            workshopId,
            recipeId,
            quantity,
            inputs: resolved,
            shuttledBy: options.shuttledBy,
        })
        const result = await transact(
            {action},
            {
                description: `Booking craft job for recipe ${recipeId} x${quantity} at workshop ${workshopId}`,
            }
        )
        await maybeAwaitAndPrint(ctx.entityId, options, result)
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'craftjob',
    description: 'Book a craft job at a Workshop',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('craftjob')
            .description('Book a craft job at a Workshop')
            .addHelpText(
                'before',
                'Requires: this entity is co-located with the Workshop, has a Generator with enough ' +
                    'energy, and holds all recipe inputs in cargo. The Workshop assigns the Fabricator ' +
                    'and the time window at booking; the receipt states when the job starts and when ' +
                    'it is done. Claim the output later with `claimcraft`.\n'
            )
            .addHelpText(
                'after',
                `
Examples:
  # Book 1× Plate T1 (10 Ore) at Workshop 1001
  shiploadcli ship 1003 craftjob 1001 10001 1 101:413333752:10

  # Book 5× Plasma Cell T1 drawing Gas from two stacks (32 × 5 = 160 total)
  shiploadcli ship 1 craftjob 1001 10003 5 301:214202522:11 301:888888888:149

See the Workshop's calendar with \`shiploadcli workshop N show\` and stack ids with \`shiploadcli ship N cargo\`.`
            )
            .argument('<workshop-id>', 'entity id of the Workshop', parseUint64)
            .argument('<recipe-id>', 'output item id from the recipe command', parseUint16)
            .argument('<quantity>', 'number of times to run the recipe', parseUint32)
            .argument(
                '<input...>',
                '<item-id>:<stack-id>:<qty> — total units to pull from a specific cargo stack. Repeat once per stack drawn.',
                accumulateCargoInputs
            )
            .option(
                '--carrier <id>',
                'entity that shuttles the cargo; a depot id uses its shuttle bays',
                parseUint64
            )
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(
                async (
                    workshopId: bigint,
                    recipeId: number,
                    quantity: number,
                    inputs: ParsedCargoInput[],
                    rawOpts: WaitableOptions & {carrier?: bigint}
                ) => {
                    const opts: CraftjobCliOptions = {...rawOpts, shuttledBy: rawOpts.carrier}
                    await runCraftjob(ctx, workshopId, recipeId, quantity, inputs, opts)
                }
            ),
}
