import {displayName, formatMass, getItem, resolveItem} from '@shipload/sdk'
import Table from 'cli-table3'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES} from '../../lib/args'
import {server} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {formatOutput, formatStats} from '../../lib/format'

export interface InventoryData {
    entityType: string
    id: bigint
    cargo: any[]
}

export function render(entityType: string, id: bigint, cargo: any[]): string {
    const header = `Inventory for ${entityType} ${id}:`
    if (cargo.length === 0) return `${header}\n  (empty)`

    const sorted = [...cargo].sort((a, b) => Number(a.item_id) - Number(b.item_id))

    const table = new Table({
        head: ['Item', 'Item ID', 'Stack ID', 'Qty', 'Stats', 'Mass'],
        chars: {
            top: '',
            'top-mid': '',
            'top-left': '',
            'top-right': '',
            bottom: '',
            'bottom-mid': '',
            'bottom-left': '',
            'bottom-right': '',
            left: '',
            'left-mid': '',
            mid: '',
            'mid-mid': '',
            right: '',
            'right-mid': '',
            middle: ' ',
        },
        style: {'padding-left': 0, 'padding-right': 2, head: [], border: []},
    })

    for (const c of sorted) {
        const itemId = Number(c.item_id)
        const stackId = BigInt(c.stats.toString())
        const qty = Number(c.quantity)
        let name = `Item ${itemId}`
        let mass = ''
        try {
            name = displayName(resolveItem(itemId))
            mass = formatMass(getItem(itemId).mass * qty)
        } catch {}
        const decoded = formatStats(stackId, itemId) ?? ''
        table.push([name, String(itemId), String(stackId), String(qty), decoded, mass])
    }

    return `${header}\n${table.toString()}`
}

export async function runInventory(ctx: EntityContext, opts: {json?: boolean}): Promise<void> {
    const info = (await server.readonly('getentity', {
        entity_type: ctx.entityType,
        entity_id: ctx.entityId,
    })) as any
    const data: InventoryData = {
        entityType: ctx.entityType,
        id: ctx.entityId,
        cargo: info.cargo ?? [],
    }
    console.log(
        formatOutput(data, {json: Boolean(opts.json)}, (d) => render(d.entityType, d.id, d.cargo))
    )
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'inventory',
    description: 'Show cargo inventory for an entity',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('inventory')
            .description('Show cargo inventory for an entity')
            .option('--json', 'emit JSON instead of formatted text')
            .action(async (opts: {json?: boolean}) => {
                await runInventory(ctx, opts)
            }),
}

export const SUBCOMMAND_CARGO_ALIAS: EntitySubcommand = {
    name: 'cargo',
    description: 'Alias for `inventory` — show cargo for an entity',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('cargo')
            .description('Show cargo (alias for inventory)')
            .option('--json', 'emit JSON instead of formatted text')
            .action(async (opts: {json?: boolean}) => {
                await runInventory(ctx, opts)
            }),
}
