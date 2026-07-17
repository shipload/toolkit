import type {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
import type {Recipe} from '../data/recipes-runtime'
import {
    availableForItem,
    projectedCargoAvailableAt,
    taskCargoEffect,
    type IncomingSource,
} from '../scheduling/availability'
import {candidateLaneCompletesAt, workerLaneKey} from '../scheduling/lanes'
import * as schedule from '../scheduling/schedule'
import type {ScheduleData} from '../scheduling/schedule'
import {calc_craft_duration} from './crafting'

type CargoItem = ServerContract.Types.cargo_item
type ModuleEntry = ServerContract.Types.module_entry

export interface CraftableEntity extends ScheduleData {
    cargo: CargoItem[]
    modules: ModuleEntry[]
}

// Recipe inputs aren't stat-pinned (any variant counts, mirroring availableForItem's item-id aggregation).
function itemReadyAt(
    entity: CraftableEntity,
    itemIds: readonly number[],
    incoming: readonly IncomingSource[]
): Date {
    let readyMs = 0
    for (const ordered of schedule.orderedTasks(entity)) {
        for (const item of taskCargoEffect(ordered.task).added) {
            if (itemIds.includes(item.item_id.toNumber())) {
                readyMs = Math.max(readyMs, ordered.completesAt.getTime())
                break
            }
        }
    }
    for (const src of incoming) {
        if (src.items.some((item) => itemIds.includes(item.item_id.toNumber()))) {
            readyMs = Math.max(readyMs, src.until.getTime())
        }
    }
    return new Date(readyMs)
}

export function maxCraftable(
    entity: CraftableEntity,
    recipe: Recipe,
    crafterSpeed: number,
    now: Date,
    incoming: readonly IncomingSource[] = []
): number {
    if (recipe.inputs.length === 0) return 0

    const perUnitMass = recipe.inputs.reduce(
        (sum, input) => sum + getItem(input.itemId).mass * input.quantity,
        0
    )
    const perUnitDuration = calc_craft_duration(crafterSpeed, perUnitMass).toNumber()
    const crafterLane = workerLaneKey(entity.modules, 'crafter', entity.lanes ?? [])
    const naiveCompletesAt = candidateLaneCompletesAt(entity, crafterLane, perUnitDuration, now)
    const laneStartMs = naiveCompletesAt.getTime() - perUnitDuration * 1000
    const readyMs = itemReadyAt(
        entity,
        recipe.inputs.map((input) => input.itemId),
        incoming
    ).getTime()
    const completesAt = new Date(Math.max(laneStartMs, readyMs) + perUnitDuration * 1000)
    const availability = projectedCargoAvailableAt(entity, completesAt, incoming)

    let maxUnits: bigint | undefined
    for (const input of recipe.inputs) {
        if (input.quantity <= 0) return 0

        const units = availableForItem(availability, input.itemId) / BigInt(input.quantity)
        maxUnits = maxUnits === undefined || units < maxUnits ? units : maxUnits
    }

    if (maxUnits === undefined) return 0
    if (maxUnits > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER
    return Number(maxUnits)
}
