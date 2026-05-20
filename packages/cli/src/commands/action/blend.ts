import {blendCargoStacks, ServerTypes, type Shipload} from '@shipload/sdk'
import {type Action, UInt64} from '@wharfkit/antelope'
import {Command} from 'commander'
import {accumulateCargoInputs, ALL_ENTITY_TYPES, type EntityTypeName} from '../../lib/args'
import {projectCargoFromSnapshot} from '../../lib/cargo-projection'
import {formatCargoRef} from '../../lib/cargo-table'
import {
    type ParsedCargoInput,
    type ResolvedCargoInput,
    resolveCargoInputs,
} from '../../lib/cargo-resolve'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {assertNotBoth, withValidation} from '../../lib/errors'
import {formatItem} from '../../lib/format'
import {formatItemStats} from '../../lib/item-stats'
import {transact} from '../../lib/session'
import {getEntitySnapshot} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'

export interface BlendOpts {
    entityType: EntityTypeName
    entityId: bigint
    inputs: ResolvedCargoInput[]
}

export async function buildAction(opts: BlendOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    const cargoInputs = opts.inputs.map((i) =>
        ServerTypes.cargo_item.from({
            item_id: i.itemId,
            quantity: i.quantity,
            stats: i.stackId,
            modules: [],
        })
    )
    return sl.actions.blend(opts.entityId, cargoInputs)
}

type BlendCliOptions = {
    estimate?: boolean
    wait?: boolean
}

export async function runBlend(
    ctx: EntityContext,
    inputs: ParsedCargoInput[],
    opts: BlendCliOptions
): Promise<void> {
    assertNotBoth(opts, ['estimate', 'wait'])
    await withValidation(async () => {
        const snap = await getEntitySnapshot(ctx.entityId)
        const resolved = resolveCargoInputs(
            inputs,
            projectCargoFromSnapshot(snap) as unknown as ServerTypes.cargo_item[]
        )
        if (opts.estimate) {
            console.log(renderBlendEstimate(resolved))
            return
        }
        const action = await buildAction({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            inputs: resolved,
        })
        await transact(
            {action},
            {
                description: `Blending on ${ctx.entityType} ${ctx.entityId}`,
                errorHint: () => {
                    const itemId = resolved[0]?.itemId
                    if (itemId === undefined) return undefined
                    const totalQty = resolved.reduce((s, r) => s + r.quantity, 0)
                    const stacks = resolved.map((r) => r.stackId.toString()).join(', ')
                    return `tried to blend ${totalQty}× ${formatCargoRef(itemId)} from stacks ${stacks}`
                },
            }
        )
        if (opts.wait) {
            console.log('blend is instantaneous; --wait is a no-op')
        }
    })
}

function renderBlendEstimate(resolved: ResolvedCargoInput[]): string {
    const itemId = resolved[0].itemId
    if (resolved.some((r) => r.itemId !== itemId)) {
        throw new ValidationError('blend requires all inputs to be the same item')
    }
    const totalQty = resolved.reduce((s, r) => s + r.quantity, 0)
    const blendedStats = blendCargoStacks(
        itemId,
        resolved.map((r) => ({quantity: r.quantity, stats: UInt64.from(r.stackId)}))
    )
    const packed = BigInt(blendedStats.toString())
    const statsLabel = formatItemStats(itemId, packed) || packed.toString()
    const itemName = formatItem(itemId)
    const lines = ['Estimate: duration 0s', 'Inputs:']
    if (resolved.length === 1) {
        const r = resolved[0]
        lines.push(`  ${itemName} ×${r.quantity}  (from stack ${r.stackId})`)
    } else {
        const breakdown = resolved.map((r) => `${r.quantity} from stack ${r.stackId}`).join(' + ')
        lines.push(`  ${itemName} ×${totalQty}  (= ${breakdown})`)
    }
    lines.push('Output:', `  ${itemName} ×${totalQty}  (stats ${statsLabel})`)
    return lines.join('\n')
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'blend',
    description: 'Blend inputs into outputs',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('blend')
            .description('Blend inputs into outputs')
            .addHelpText(
                'before',
                'Requires: multiple stacks of the same item in cargo; entity idle.\n'
            )
            .addHelpText(
                'after',
                `
Example:
  # Blend two Gas stacks (11 + 21 = 32 units total)
  shiploadcli ship 1 blend 301:1000:11 301:2000:21

Use \`shiploadcli ship N cargo\` to find item-ids and stack-ids.`
            )
            .argument(
                '<input...>',
                '<item-id>:<stack-id>:<qty> — total units to pull from a specific cargo stack. Repeat once per stack.',
                accumulateCargoInputs
            )
            .option('--estimate', 'print duration/energy/cargo estimate without submitting')
            .option('--wait', 'no-op for blend (instantaneous); accepted for consistency')
            .action(async (inputs: ParsedCargoInput[], opts: BlendCliOptions) => {
                await runBlend(ctx, inputs, opts)
            }),
}
