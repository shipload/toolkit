import {Command} from 'commander'
import type {ServerTypes} from '@shipload/sdk'
import {ALL_ENTITY_TYPES} from '../../lib/args'
import {formatCargoTable} from '../../lib/cargo-table'
import {server} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {formatOutput} from '../../lib/format'

export interface InventoryData {
    entityType: string
    id: bigint
    cargo: ServerTypes.cargo_item[]
}

export function render(entityType: string, id: bigint, cargo: ServerTypes.cargo_item[]): string {
    const header = `Inventory for ${entityType} ${id}:`
    if (cargo.length === 0) return `${header}\n  (empty)`

    const sorted = [...cargo].sort((a, b) => Number(a.item_id) - Number(b.item_id))
    const table = formatCargoTable(sorted)
    return `${header}\n${table}`
}

export async function runInventory(ctx: EntityContext, opts: {json?: boolean}): Promise<void> {
    const info = (await server.readonly('getentity', {
        entity_type: ctx.entityType,
        entity_id: ctx.entityId,
    })) as {cargo?: ServerTypes.cargo_item[]}
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
