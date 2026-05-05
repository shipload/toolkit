import type {ServerContract} from '../contracts'
import {TaskType} from '../types'

export type PredictedCargoTarget = {kind: 'existing'; rowId: bigint} | {kind: 'new'; label: string}

export interface PredictedCargoAddition {
    item_id: number
    stats: bigint
    modules: ServerContract.Types.module_entry[]
    quantity: number
    target: PredictedCargoTarget
}

export interface TaskCargoEffect {
    additions: PredictedCargoAddition[]
}

interface StackState {
    item_id: number
    stats: bigint
    modules: ServerContract.Types.module_entry[]
    quantity: number
    target: PredictedCargoTarget
}

function modulesEqual(
    a: ServerContract.Types.module_entry[],
    b: ServerContract.Types.module_entry[]
): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        const ai = a[i]
        const bi = b[i]
        if (Number(ai.type) !== Number(bi.type)) return false
        const aInst = ai.installed
        const bInst = bi.installed
        if (!aInst && !bInst) continue
        if (!aInst || !bInst) return false
        if (Number(aInst.item_id) !== Number(bInst.item_id)) return false
        if (BigInt(aInst.stats.toString()) !== BigInt(bInst.stats.toString())) return false
    }
    return true
}

function findStack(
    state: StackState[],
    item_id: number,
    stats: bigint,
    modules: ServerContract.Types.module_entry[]
): number {
    for (let i = 0; i < state.length; i++) {
        const s = state[i]
        if (s.item_id !== item_id) continue
        if (s.stats !== stats) continue
        if (!modulesEqual(s.modules, modules)) continue
        return i
    }
    return -1
}

function applyAddition(
    state: StackState[],
    item: ServerContract.Types.cargo_item,
    nextNewLabel: () => string
): PredictedCargoAddition {
    const item_id = Number(item.item_id)
    const stats = BigInt(item.stats.toString())
    const modules = item.modules ?? []
    const quantity = Number(item.quantity)

    const idx = findStack(state, item_id, stats, modules)
    if (idx === -1) {
        const target: PredictedCargoTarget = {kind: 'new', label: nextNewLabel()}
        state.push({item_id, stats, modules, quantity, target})
        return {item_id, stats, modules, quantity, target}
    }
    state[idx].quantity += quantity
    return {item_id, stats, modules, quantity, target: state[idx].target}
}

function applyRemoval(state: StackState[], item: ServerContract.Types.cargo_item): void {
    const item_id = Number(item.item_id)
    const stats = BigInt(item.stats.toString())
    const modules = item.modules ?? []
    const quantity = Number(item.quantity)

    const idx = findStack(state, item_id, stats, modules)
    if (idx === -1) return
    state[idx].quantity -= quantity
    if (state[idx].quantity <= 0) state.splice(idx, 1)
}

export function predictTaskCargoEffects(
    cargo: readonly ServerContract.Types.cargo_view[],
    tasks: readonly ServerContract.Types.task[]
): TaskCargoEffect[] {
    const state: StackState[] = cargo.map((c) => ({
        item_id: Number(c.item_id),
        stats: BigInt(c.stats.toString()),
        modules: c.modules ?? [],
        quantity: Number(c.quantity),
        target: {kind: 'existing', rowId: BigInt(c.id.toString())},
    }))

    let newCounter = 0
    const nextNewLabel = () => {
        newCounter += 1
        return `new#${newCounter}`
    }

    const effects: TaskCargoEffect[] = []

    for (const task of tasks) {
        const type = Number(task.type)
        const items = task.cargo ?? []
        const additions: PredictedCargoAddition[] = []

        switch (type) {
            case TaskType.LOAD:
            case TaskType.UNWRAP: {
                for (const item of items) additions.push(applyAddition(state, item, nextNewLabel))
                break
            }
            case TaskType.GATHER: {
                if (!task.entitytarget) {
                    for (const item of items)
                        additions.push(applyAddition(state, item, nextNewLabel))
                }
                break
            }
            case TaskType.UNLOAD:
            case TaskType.WRAP: {
                for (const item of items) applyRemoval(state, item)
                break
            }
            case TaskType.CRAFT: {
                if (items.length > 0) {
                    for (let i = 0; i < items.length - 1; i++) applyRemoval(state, items[i])
                    additions.push(applyAddition(state, items[items.length - 1], nextNewLabel))
                }
                break
            }
            default:
                break
        }

        effects.push({additions})
    }

    return effects
}
