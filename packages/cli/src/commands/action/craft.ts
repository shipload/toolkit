import {type Action, Name} from '@wharfkit/antelope'
import {Command} from 'commander'
import {Types as ServerTypes} from '../../contracts/server'
import {type EntityTypeName, parseCargoInput, parseUint16, parseUint32} from '../../lib/args'
import {
    type ParsedCargoInput,
    type ResolvedCargoInput,
    resolveCargoInputs,
} from '../../lib/cargo-resolve'
import {getShipload, server} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {assertNotBoth, withValidation} from '../../lib/errors'
import {estimateCraft} from '../../lib/estimate'
import {renderIssues} from '../../lib/feasibility'
import {renderEstimate} from '../../lib/render-estimate'
import {checkResolveEntity} from '../../lib/resolve-prompt'
import {transact} from '../../lib/session'
import {getEntitySnapshot} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'
import {buildAction as buildRechargeAction} from './recharge'

export interface CraftOpts {
    entityType: EntityTypeName
    entityId: bigint
    recipeId: number
    quantity: number
    inputs: ResolvedCargoInput[]
}

export async function buildAction(opts: CraftOpts): Promise<Action> {
    const shipload = await getShipload()
    const cargoInputs = opts.inputs.map((i) =>
        ServerTypes.cargo_item.from({
            item_id: i.itemId,
            quantity: i.quantity,
            stats: i.stackId,
            modules: [],
        })
    )
    return shipload.actions.craft(
        Name.from(opts.entityType),
        opts.entityId,
        opts.recipeId,
        opts.quantity,
        cargoInputs
    )
}

type CraftCliOptions = {
    autoResolve?: boolean
    estimate?: boolean
    wait?: boolean
    track?: boolean
    force?: boolean
    recharge?: boolean
}

async function validateRecipeSlotTotals(
    recipeId: number,
    quantity: number,
    resolved: ResolvedCargoInput[]
): Promise<void> {
    const recipeRes = (await server.readonly('getrecipe', {
        output_item_id: recipeId,
    })) as unknown as {
        recipes: {inputs: {item_id: number; quantity: number}[]}[]
    }
    const recipe = recipeRes.recipes?.[0]
    if (!recipe) return
    for (const slot of recipe.inputs) {
        const slotItemId = Number(slot.item_id)
        if (slotItemId === 0) continue
        const matching = resolved.filter((r) => r.itemId === slotItemId)
        const provided = matching.reduce((sum, r) => sum + r.quantity, 0)
        const required = Number(slot.quantity) * quantity
        if (provided !== required) {
            throw new ValidationError(
                `recipe input slot for item ${slotItemId} needs ${required} units (${slot.quantity} × ${quantity}), got ${provided}`
            )
        }
    }
}

export async function runCraft(
    ctx: EntityContext,
    recipeId: number,
    quantity: number,
    inputs: ParsedCargoInput[],
    options: CraftCliOptions
): Promise<void> {
    assertNotBoth(options, ['estimate', 'wait'], ['estimate', 'track'])
    await withValidation(async () => {
        if (!options.estimate) {
            await checkResolveEntity(ctx.entityType, ctx.entityId, Boolean(options.autoResolve))
        }
        const snap = await getEntitySnapshot(ctx.entityType, ctx.entityId)
        const resolved = resolveCargoInputs(
            inputs,
            snap.cargo as unknown as ServerTypes.cargo_item[]
        )
        await validateRecipeSlotTotals(recipeId, quantity, resolved)
        const est = await estimateCraft({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            recipeId,
            quantity,
            inputs: resolved,
            snapshot: snap,
            recharge: Boolean(options.recharge),
        })
        if (options.estimate) {
            console.log(renderEstimate(est))
            return
        }
        if (!est.feasibility.ok) {
            console.error(renderIssues(est.feasibility.issues))
            if (!options.force) process.exit(1)
        }
        const action = await buildAction({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            recipeId,
            quantity,
            inputs: resolved,
        })
        const result = options.recharge
            ? await transact(
                  {
                      actions: [
                          await buildRechargeAction({
                              entityType: ctx.entityType,
                              entityId: ctx.entityId,
                          }),
                          action,
                      ],
                  },
                  {description: `Recharge + craft recipe ${recipeId} x${quantity}`}
              )
            : await transact({action}, {description: `Crafting recipe ${recipeId} x${quantity}`})
        await maybeAwaitAndPrint(ctx.entityType, ctx.entityId, options, result)
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'craft',
    description: 'Craft items from a recipe',
    appliesTo: ['ship'],
    build: (ctx) =>
        new Command('craft')
            .description('Craft items from a recipe')
            .addHelpText(
                'before',
                'Requires: ship is idle; all inputs are in cargo; Crafter module in a ship slot.\n'
            )
            .addHelpText(
                'after',
                `
Examples:
  # Craft 1× Thruster Core T1 (recipe needs 32 Gas T1)
  shiploadcli ship 1 craft 10003 1 301:214202522:32

  # Craft 5× Thruster Core T1 (32 × 5 = 160 Gas total from one stack)
  shiploadcli ship 1 craft 10003 5 301:214202522:160

  # Same recipe, drawing from two Gas stacks (11 + 149 = 160)
  shiploadcli ship 1 craft 10003 5 301:214202522:11 301:888888888:149

Use \`shiploadcli ship N cargo\` to find item-ids and stack-ids.`
            )
            .argument('<recipe-id>', 'output item id from the recipe command', parseUint16)
            .argument('<quantity>', 'number of times to run the recipe', parseUint32)
            .argument(
                '<input...>',
                '<item-id>:<stack-id>:<qty> — total units to pull from a specific cargo stack. Repeat once per stack drawn.',
                parseCargoInput
            )
            .option('--auto-resolve', 'resolve completed tasks on the target entity before acting')
            .option('--estimate', 'print duration/energy/cargo estimate without submitting')
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .option('--force', 'submit despite failed feasibility checks (advanced)')
            .option('--recharge', 'recharge to full energy before crafting')
            .action(
                async (
                    recipeId: number,
                    quantity: number,
                    inputs: ParsedCargoInput[],
                    opts: CraftCliOptions
                ) => {
                    await runCraft(ctx, recipeId, quantity, inputs, opts)
                }
            ),
}
