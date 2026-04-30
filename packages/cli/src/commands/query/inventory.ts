import {Command} from 'commander'
import type {ServerTypes} from '@shipload/sdk'
import {ALL_ENTITY_TYPES} from '../../lib/args'
import {formatCargoTable} from '../../lib/cargo-table'
import {server} from '../../lib/client'
import {renderEntityHeader} from '../../lib/entity-header'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {formatOutput} from '../../lib/format'

export interface InventoryData {
    entity: ServerTypes.entity_info
    cargo: ServerTypes.cargo_view[]
}

export function render(entity: ServerTypes.entity_info, cargo: ServerTypes.cargo_view[]): string {
    const header = renderEntityHeader(entity)
    if (cargo.length === 0) return `${header}\n  (empty)`

    const sorted = [...cargo].sort((a, b) => {
        const itemDiff = Number(a.item_id) - Number(b.item_id)
        if (itemDiff !== 0) return itemDiff
        const aIdRaw = (a as any).id
        const bIdRaw = (b as any).id
        const aId = aIdRaw === undefined || aIdRaw === null ? 0n : BigInt(aIdRaw.toString())
        const bId = bIdRaw === undefined || bIdRaw === null ? 0n : BigInt(bIdRaw.toString())
        if (aId === 0n && bId !== 0n) return 1
        if (bId === 0n && aId !== 0n) return -1
        if (aId < bId) return -1
        if (aId > bId) return 1
        return 0
    })
    const table = formatCargoTable(sorted, {
        columns: ['rowId', 'item', 'itemId', 'stack', 'qty', 'each', 'mass', 'stats'],
    })
    return `${header}\n${table}`
}

export async function runInventory(ctx: EntityContext, opts: {json?: boolean}): Promise<void> {
    const info = (await server.readonly('getentity', {
        entity_type: ctx.entityType,
        entity_id: ctx.entityId,
    })) as ServerTypes.entity_info & {cargo?: ServerTypes.cargo_view[]}
    const data: InventoryData = {
        entity: info,
        cargo: info.cargo ?? [],
    }
    console.log(
        formatOutput(data, {json: Boolean(opts.json)}, (d) => render(d.entity, d.cargo))
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
