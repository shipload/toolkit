import type {ServerContract} from '../contracts'
import {type TaskCargoRule, taskCargoRule} from './task-effects'

export type TaskCargoDirection = 'in' | 'out'

export interface TaskCargoChange {
    direction: TaskCargoDirection
    item_id: number
    stats: bigint
    modules: ServerContract.Types.module_entry[]
    quantity: number
    entity_id?: bigint
}

export type TaskCargoResult =
    | {known: true; changes: TaskCargoChange[]}
    | {known: false; taskType: number}

function toChange(
    item: ServerContract.Types.cargo_item,
    direction: TaskCargoDirection
): TaskCargoChange {
    const entityId = BigInt(item.entity_id?.toString() ?? '0')
    return {
        direction,
        item_id: Number(item.item_id),
        stats: BigInt(item.stats.toString()),
        modules: item.modules ?? [],
        quantity: Number(item.quantity),
        ...(entityId !== 0n ? {entity_id: entityId} : {}),
    }
}

function changesForRule(rule: TaskCargoRule, task: ServerContract.Types.task): TaskCargoChange[] {
    const items = task.cargo ?? []
    if (items.length === 0) return []
    switch (rule) {
        case 'all-in':
        case 'undeploy':
            return items.map((i) => toChange(i, 'in'))
        case 'all-out':
            return items.map((i) => toChange(i, 'out'))
        case 'gather':
            return task.couplings.length > 0 ? [] : items.map((i) => toChange(i, 'in'))
        case 'craft':
            return [
                ...items.slice(0, -1).map((i) => toChange(i, 'out')),
                ...(task.couplings.length > 0 ? [] : [toChange(items[items.length - 1], 'in')]),
            ]
        default:
            return []
    }
}

export function taskCargoChanges(task: ServerContract.Types.task): TaskCargoChange[] {
    const rule = taskCargoRule(Number(task.type))
    return rule ? changesForRule(rule, task) : []
}

export function taskCargoChangesChecked(task: ServerContract.Types.task): TaskCargoResult {
    const type = Number(task.type)
    const rule = taskCargoRule(type)
    if (!rule) return {known: false, taskType: type}
    return {known: true, changes: changesForRule(rule, task)}
}
