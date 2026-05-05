import type {ServerContract} from '../contracts'
import {TaskType} from '../types'

export interface TaskCargoAddition {
    item_id: number
    stats: bigint
    modules: ServerContract.Types.module_entry[]
    quantity: number
}

function toAddition(item: ServerContract.Types.cargo_item): TaskCargoAddition {
    return {
        item_id: Number(item.item_id),
        stats: BigInt(item.stats.toString()),
        modules: item.modules ?? [],
        quantity: Number(item.quantity),
    }
}

export function taskCargoAdditions(task: ServerContract.Types.task): TaskCargoAddition[] {
    const items = task.cargo ?? []
    if (items.length === 0) return []
    switch (Number(task.type)) {
        case TaskType.LOAD:
        case TaskType.UNWRAP:
            return items.map(toAddition)
        case TaskType.GATHER:
            return task.entitytarget ? [] : items.map(toAddition)
        case TaskType.CRAFT:
            return [toAddition(items[items.length - 1])]
        default:
            return []
    }
}
