import {getRecipe, type IncomingSource, ServerTypes, type Shipload} from '@shipload/sdk'
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
import {decideUseRecharge} from '../../lib/auto-recharge'
import {type ProjectedCargoStack, projectCargoFromSnapshot} from '../../lib/cargo-projection'
import {formatCargoRef, safeItemName} from '../../lib/cargo-table'
import {
    type ParsedCargoInput,
    type ResolvedCargoInput,
    resolveCargoInputs,
} from '../../lib/cargo-resolve'
import {getShipload, server} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {assertNotBoth, withValidation} from '../../lib/errors'
import {buildIncomingSources, estimateCraft} from '../../lib/estimate'
import {renderIssues} from '../../lib/feasibility'
import {renderEstimate} from '../../lib/render-estimate'
import {transact} from '../../lib/session'
import {getEntitySnapshot} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'
import {
    AUTO_RESOLVE_OPTION,
    maybeAwaitAndPrint,
    TRACK_OPTION,
    WAIT_OPTION,
    type WaitableOptions,
} from '../../lib/wait'
import {buildAction as buildRechargeAction} from './recharge'

export interface CraftOpts {
    entityType: EntityTypeName
    entityId: bigint
    recipeId: number
    quantity: number
    inputs: ResolvedCargoInput[]
    target?: bigint
}

export async function buildAction(opts: CraftOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    const cargoInputs = opts.inputs.map((i) =>
        ServerTypes.cargo_item.from({
            item_id: i.itemId,
            quantity: i.quantity,
            stats: i.stackId,
            modules: [],
        })
    )
    return sl.actions.craft(opts.entityId, opts.recipeId, opts.quantity, cargoInputs, opts.target)
}

type CraftCliOptions = WaitableOptions & {
    estimate?: boolean
    force?: boolean
    recharge?: boolean
    autoRecharge?: boolean
    target?: bigint
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

// Folds incoming manifest items into projected stacks by item+stats, mirroring resolveCargoInputs' own matching.
function mergeIncomingCargo(
    stacks: ProjectedCargoStack[],
    incoming: IncomingSource[]
): ProjectedCargoStack[] {
    const merged = stacks.map((s) => ({...s}))
    for (const src of incoming) {
        for (const item of src.items) {
            const itemId = BigInt(item.item_id.toString())
            const stats = BigInt(item.stats.toString())
            const quantity = BigInt(item.quantity.toString())
            const idx = merged.findIndex((s) => s.item_id === itemId && s.stats === stats)
            if (idx === -1) {
                merged.push({item_id: itemId, stats, quantity, modules: item.modules ?? [], id: 0n})
            } else {
                merged[idx] = {...merged[idx], quantity: merged[idx].quantity + quantity}
            }
        }
    }
    return merged
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
        const snap = await getEntitySnapshot(ctx.entityId)
        const rawEntity = (await server.readonly('getentity', {
            entity_id: ctx.entityId,
        })) as unknown as ServerTypes.entity_info
        const incoming = await buildIncomingSources(ctx.entityId, rawEntity.holds ?? [])
        const resolved = resolveCargoInputs(
            inputs,
            mergeIncomingCargo(
                projectCargoFromSnapshot(snap),
                incoming
            ) as unknown as ServerTypes.cargo_item[]
        )
        await validateRecipeSlotTotals(recipeId, quantity, resolved)
        const rechargeRequested = Boolean(options.recharge)
        const est = await estimateCraft({
            entityId: ctx.entityId,
            recipeId,
            quantity,
            inputs: resolved,
            snapshot: snap,
            recharge: rechargeRequested,
            incoming,
        })
        if (options.estimate) {
            console.log(renderEstimate(est))
            return
        }
        const useRecharge = await decideUseRecharge({
            rechargeRequested,
            autoRecharge: Boolean(options.autoRecharge),
            baseEstimate: est,
            reestimateWithRecharge: () =>
                estimateCraft({
                    entityId: ctx.entityId,
                    recipeId,
                    quantity,
                    inputs: resolved,
                    snapshot: snap,
                    recharge: true,
                    incoming,
                }),
        })
        if (!useRecharge && !est.feasibility.ok) {
            console.error(renderIssues(est.feasibility.issues))
            if (!options.force) process.exit(1)
        }
        const action = await buildAction({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            recipeId,
            quantity,
            inputs: resolved,
            target: options.target,
        })
        const craftErrorHint = (): string => {
            const recipe = getRecipe(recipeId)
            const outputLabel = recipe
                ? `${safeItemName(recipe.outputItemId)} (recipe ${recipeId})`
                : `recipe ${recipeId}`
            const inputSummary = resolved
                .map((r) => `${r.quantity}× ${formatCargoRef(r.itemId, r.stackId)}`)
                .join(', ')
            return `tried to craft ${quantity}× ${outputLabel} using ${inputSummary}`
        }
        const result = useRecharge
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
                  {
                      description: `Recharge + craft recipe ${recipeId} x${quantity}`,
                      errorHint: craftErrorHint,
                  }
              )
            : await transact(
                  {action},
                  {
                      description: `Crafting recipe ${recipeId} x${quantity}`,
                      errorHint: craftErrorHint,
                  }
              )
        await maybeAwaitAndPrint(ctx.entityId, options, result)
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'craft',
    description: 'Craft items from a recipe',
    appliesTo: ALL_ENTITY_TYPES,
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
  # Craft 1× Plasma Cell T1 (recipe needs 32 Gas T1)
  shiploadcli ship 1 craft 10003 1 301:214202522:32

  # Craft 5× Plasma Cell T1 (32 × 5 = 160 Gas total from one stack)
  shiploadcli ship 1 craft 10003 5 301:214202522:160

  # Same recipe, drawing from two Gas stacks (11 + 149 = 160)
  shiploadcli ship 1 craft 10003 5 301:214202522:11 301:888888888:149

  # Cross-craft: ship 1 crafts, output lands in co-located warehouse 2
  shiploadcli ship 1 craft 10003 1 301:214202522:32 --target 2

Use \`shiploadcli ship N cargo\` to find item-ids and stack-ids.`
            )
            .argument('<recipe-id>', 'output item id from the recipe command', parseUint16)
            .argument('<quantity>', 'number of times to run the recipe', parseUint32)
            .argument(
                '<input...>',
                '<item-id>:<stack-id>:<qty> — total units to pull from a specific cargo stack. Repeat once per stack drawn.',
                accumulateCargoInputs
            )
            .option('--estimate', 'print duration/energy/cargo estimate without submitting')
            .option(
                '--target <entity-id>',
                'cross-craft: deposit the output into a co-located entity you own instead of this one',
                parseUint64
            )
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .addOption(AUTO_RESOLVE_OPTION)
            .option('--force', 'submit despite failed feasibility checks (advanced)')
            .option('--recharge', 'recharge to full energy before crafting')
            .option(
                '--auto-recharge',
                'recharge before crafting only when projected energy is insufficient (--recharge always recharges)'
            )
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
