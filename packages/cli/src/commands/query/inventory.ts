import {Command} from 'commander'
import type {ServerTypes} from '@shipload/sdk'
import {ALL_ENTITY_TYPES} from '../../lib/args'
import {
    projectCargoFromSnapshot,
    snapshotToStacks,
    type ProjectedCargoStack,
} from '../../lib/cargo-projection'
import {server} from '../../lib/client'
import {renderInventoryView} from '../../lib/entity-header'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {formatOutput} from '../../lib/format'
import {entityInfoToSnapshot} from '../../lib/snapshot'

export interface InventoryData {
    entity: ServerTypes.entity_info
    cargo: ServerTypes.cargo_view[]
    projected_cargo: ProjectedCargoStack[]
    projection: {
        applies: boolean
        tasks_considered: number
    }
}

export function render(entity: ServerTypes.entity_info, opts: {current?: boolean} = {}): string {
    return renderInventoryView(entity, {current: opts.current}).text
}

export function buildInventoryData(
    entity: ServerTypes.entity_info,
    opts: {current?: boolean} = {}
): InventoryData {
    const view = renderInventoryView(entity, {current: opts.current})
    const cargo = (entity.cargo ?? []) as ServerTypes.cargo_view[]

    let projectedCargo: ProjectedCargoStack[]
    if (view.tasksConsidered > 0) {
        const snap = entityInfoToSnapshot(entity)
        projectedCargo = projectCargoFromSnapshot(snap)
    } else {
        projectedCargo = snapshotToStacks(entityInfoToSnapshot(entity))
    }

    return {
        entity,
        cargo,
        projected_cargo: projectedCargo,
        projection: {
            applies: view.projectionApplied,
            tasks_considered: view.tasksConsidered,
        },
    }
}

export async function runInventory(
    ctx: EntityContext,
    opts: {json?: boolean; current?: boolean}
): Promise<void> {
    const info = (await server.readonly('getentity', {
        entity_id: ctx.entityId,
    })) as ServerTypes.entity_info & {cargo?: ServerTypes.cargo_view[]}
    const data = buildInventoryData(info, {current: opts.current})
    console.log(
        formatOutput(
            data,
            {json: Boolean(opts.json)},
            () => renderInventoryView(info, {current: opts.current}).text
        )
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
            .option('--current', 'show on-chain cargo without applying the pending task queue')
            .action(async (opts: {json?: boolean; current?: boolean}) => {
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
            .option('--current', 'show on-chain cargo without applying the pending task queue')
            .action(async (opts: {json?: boolean; current?: boolean}) => {
                await runInventory(ctx, opts)
            }),
}
