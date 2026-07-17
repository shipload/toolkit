import type {ServerContract} from '../contracts'
import {HoldKind, TaskType} from '../types'
import * as schedule from './schedule'

type Task = ServerContract.Types.task
type Coupling = ServerContract.Types.coupling
type CargoItem = ServerContract.Types.cargo_item
type ModuleEntry = ServerContract.Types.module_entry

export interface CargoEffect {
    added: CargoItem[]
    removed: CargoItem[]
}

export interface AvailabilityInput extends schedule.ScheduleData {
    cargo: CargoItem[]
}

export interface CargoInput {
    itemId: number
    stats: bigint
    modules?: ModuleEntry[]
    quantity: number
}

export interface IncomingSource {
    holdId: string
    until: Date
    items: CargoItem[]
}

const INCOMING_COUPLING_KINDS = new Set<number>([HoldKind.PUSH, HoldKind.GATHER, HoldKind.FLIGHT])

// Mirrors is_incoming_hold_kind: PUSH/GATHER/FLIGHT couplings deliver to the counterpart.
export function isIncomingCouplingKind(kind: number): boolean {
    return INCOMING_COUPLING_KINDS.has(kind)
}

// Mirrors calc_counterpart_delivery: incoming-kind couplings only; a coupled CRAFT yields its output slot.
export function calcCounterpartDelivery(task: Task, coupling: Coupling): CargoItem[] {
    if (!isIncomingCouplingKind(coupling.kind.toNumber())) return []
    if (task.type.toNumber() === TaskType.CRAFT) {
        return task.cargo.length === 0 ? [] : [task.cargo[task.cargo.length - 1]]
    }
    return task.cargo
}

export function taskCargoEffect(task: Task): CargoEffect {
    switch (task.type.toNumber()) {
        case TaskType.LOAD:
        case TaskType.UNWRAP:
        case TaskType.UNDEPLOY:
            return {added: task.cargo, removed: []}
        case TaskType.UNLOAD:
        case TaskType.UPGRADE:
            return {added: [], removed: task.cargo}
        case TaskType.GATHER:
            return task.couplings.length > 0
                ? {added: [], removed: []}
                : {added: task.cargo, removed: []}
        case TaskType.CRAFT:
            if (task.cargo.length === 0) return {added: [], removed: []}
            return {
                added: task.couplings.length === 0 ? [task.cargo[task.cargo.length - 1]] : [],
                removed: task.cargo.slice(0, -1),
            }
        default:
            return {added: [], removed: []}
    }
}

function refKey(itemId: number, stats: bigint, modules: ModuleEntry[], entityId: string): string {
    const base = `${itemId}:${stats.toString()}`
    const normalizedEntityId = entityId !== '0' ? entityId : ''
    if (modules.length === 0 && normalizedEntityId === '') return base
    return `${base}:modules=${JSON.stringify(modules)}:entity=${normalizedEntityId}`
}

export function cargoKey(item: CargoItem): string {
    return refKey(
        item.item_id.toNumber(),
        BigInt(item.stats.toString()),
        item.modules ?? [],
        item.entity_id?.toString() ?? ''
    )
}

export function cargoInputKey(input: CargoInput): string {
    return refKey(input.itemId, input.stats, input.modules ?? [], '')
}

function cargoQuantity(item: CargoItem): bigint {
    return BigInt(item.quantity.toString())
}

export function projectedCargoAvailableAt(
    entity: AvailabilityInput,
    at: Date,
    incoming: readonly IncomingSource[] = []
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

    for (const src of incoming) {
        if (src.until.getTime() >= at.getTime()) continue
        for (const item of src.items) {
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

// Earliest-sufficient candidate (epoch, own-lane producer completions, incoming untils); else the latest candidate.
export function cargoReadyAt(
    entity: AvailabilityInput,
    inputs: readonly CargoInput[],
    incoming: readonly IncomingSource[] = []
): Date {
    const demand = new Map<string, bigint>()
    for (const input of inputs) {
        const key = cargoInputKey(input)
        demand.set(key, (demand.get(key) ?? 0n) + BigInt(input.quantity))
    }

    const candidates: number[] = [0]
    for (const ordered of schedule.orderedTasks(entity)) {
        for (const item of taskCargoEffect(ordered.task).added) {
            if (demand.has(cargoKey(item))) {
                candidates.push(ordered.completesAt.getTime())
                break
            }
        }
    }
    for (const src of incoming) {
        if (src.items.some((item) => demand.has(cargoKey(item)))) {
            candidates.push(src.until.getTime())
        }
    }
    candidates.sort((a, b) => a - b)

    for (const candidateMs of candidates) {
        // +1ms mirrors the contract's candidate+1µs probe: inclusive at the candidate instant.
        const available = projectedCargoAvailableAt(entity, new Date(candidateMs + 1), incoming)
        let sufficient = true
        for (const [key, quantity] of demand) {
            if ((available.get(key) ?? 0n) < quantity) {
                sufficient = false
                break
            }
        }
        if (sufficient) return new Date(candidateMs)
    }
    return new Date(candidates[candidates.length - 1])
}

export function availableForItem(avail: Map<string, bigint>, itemId: number): bigint {
    const prefix = `${itemId}:`
    let total = 0n
    for (const [key, quantity] of avail) {
        if (key.startsWith(prefix)) total += quantity
    }
    return total
}
