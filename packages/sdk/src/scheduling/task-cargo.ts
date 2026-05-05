import type {ServerContract} from '../contracts'
import {TaskType} from '../types'

export type TaskCargoDirection = 'in' | 'out'

export interface TaskCargoChange {
    direction: TaskCargoDirection
    item_id: number
    stats: bigint
    modules: ServerContract.Types.module_entry[]
    quantity: number
}

function toChange(
    item: ServerContract.Types.cargo_item,
    direction: TaskCargoDirection
): TaskCargoChange {
    return {
        direction,
        item_id: Number(item.item_id),
        stats: BigInt(item.stats.toString()),
        modules: item.modules ?? [],
        quantity: Number(item.quantity),
    }
}

export function taskCargoChanges(task: ServerContract.Types.task): TaskCargoChange[] {
    const items = task.cargo ?? []
    if (items.length === 0) return []
    switch (Number(task.type)) {
        case TaskType.LOAD:
        case TaskType.UNWRAP:
            return items.map((i) => toChange(i, 'in'))
        case TaskType.GATHER:
            return task.entitytarget ? [] : items.map((i) => toChange(i, 'in'))
        case TaskType.UNLOAD:
        case TaskType.WRAP:
            return items.map((i) => toChange(i, 'out'))
        case TaskType.CRAFT:
            return [
                ...items.slice(0, -1).map((i) => toChange(i, 'out')),
                toChange(items[items.length - 1], 'in'),
            ]
        default:
            return []
    }
}
