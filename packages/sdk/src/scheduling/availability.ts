import type {ServerContract} from '../contracts'
import {TaskType} from '../types'
import * as schedule from './schedule'

type Task = ServerContract.Types.task
type CargoItem = ServerContract.Types.cargo_item

export interface CargoEffect {
    added: CargoItem[]
    removed: CargoItem[]
}

export interface AvailabilityInput extends schedule.ScheduleData {
    cargo: CargoItem[]
}

export function taskCargoEffect(task: Task): CargoEffect {
    switch (task.type.toNumber()) {
        case TaskType.LOAD:
        case TaskType.UNWRAP:
        case TaskType.UNDEPLOY:
            return {added: task.cargo, removed: []}
        case TaskType.UNLOAD:
            return {added: [], removed: task.cargo}
        case TaskType.GATHER:
            return task.entitytarget ? {added: [], removed: []} : {added: task.cargo, removed: []}
        case TaskType.CRAFT:
            if (task.cargo.length === 0) return {added: [], removed: []}
            return {added: [task.cargo[task.cargo.length - 1]], removed: task.cargo.slice(0, -1)}
        case TaskType.DEPLOY:
            return task.cargo.length > 0
                ? {added: [], removed: [task.cargo[0]]}
                : {added: [], removed: []}
        default:
            return {added: [], removed: []}
    }
}

function cargoKey(item: CargoItem): string {
    const base = `${item.item_id.toNumber()}:${item.stats.toString()}`
    const modules = item.modules ?? []
    const entityId = item.entity_id?.toString()
    const normalizedEntityId = entityId && entityId !== '0' ? entityId : ''
    if (modules.length === 0 && normalizedEntityId === '') return base
    return `${base}:modules=${JSON.stringify(modules)}:entity=${normalizedEntityId}`
}

function cargoQuantity(item: CargoItem): bigint {
    return BigInt(item.quantity.toString())
}

export function projectedCargoAvailableAt(
    entity: AvailabilityInput,
    at: Date
): Map<string, bigint> {
    const avail = new Map<string, bigint>()

    for (const item of entity.cargo) {
        const key = cargoKey(item)
        avail.set(key, (avail.get(key) ?? 0n) + cargoQuantity(item))
    }

    // Every scheduled task reserves inputs against the unsettled cargo base, even already-elapsed ones.
    const tasks = schedule.orderedTasks(entity)

    for (const ordered of tasks) {
        if (ordered.completesAt.getTime() >= at.getTime()) continue

        for (const item of taskCargoEffect(ordered.task).added) {
            const key = cargoKey(item)
            avail.set(key, (avail.get(key) ?? 0n) + cargoQuantity(item))
        }
    }

    for (const ordered of tasks) {
        for (const item of taskCargoEffect(ordered.task).removed) {
            const key = cargoKey(item)
            const current = avail.get(key) ?? 0n
            const quantity = cargoQuantity(item)
            avail.set(key, current > quantity ? current - quantity : 0n)
        }
    }

    return avail
}

// Latest completion among scheduled tasks producing any of the given inputs (a craft starts no earlier).
export function cargoReadyAt(entity: AvailabilityInput, inputItemIds: readonly number[]): Date {
    let readyMs = 0
    for (const ordered of schedule.orderedTasks(entity)) {
        for (const item of taskCargoEffect(ordered.task).added) {
            if (inputItemIds.includes(item.item_id.toNumber())) {
                readyMs = Math.max(readyMs, ordered.completesAt.getTime())
                break
            }
        }
    }
    return new Date(readyMs)
}

export function availableForItem(avail: Map<string, bigint>, itemId: number): bigint {
    const prefix = `${itemId}:`
    let total = 0n
    for (const [key, quantity] of avail) {
        if (key.startsWith(prefix)) total += quantity
    }
    return total
}
