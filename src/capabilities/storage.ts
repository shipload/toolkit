import {UInt16, UInt32, UInt64, UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {StorageCapability} from '../types/capabilities'
import {getItem} from '../market/items'
import {INSUFFICIENT_ITEM_QUANTITY} from '../errors'

export interface HasCargo {
    cargo: ServerContract.Types.cargo_item[]
}

export interface HasCapacity {
    capacity: UInt32
}

export interface HasCargomass {
    cargomass: UInt32
}

interface MassInput {
    item_id: UInt16
    quantity: UInt32
    modules: ServerContract.Types.module_entry[]
}

export function calcCargoItemMass(item: MassInput): UInt64 {
    const itemDef = getItem(item.item_id)
    let mass = UInt64.from(itemDef.mass).multiplying(item.quantity)

    for (const mod of item.modules) {
        if (mod.installed) {
            const modDef = getItem(mod.installed.item_id)
            mass = mass.adding(modDef.mass)
        }
    }

    return mass
}

export function calcCargoMass(entity: HasCargo): UInt64 {
    let mass = UInt64.from(0)
    for (const item of entity.cargo) {
        mass = mass.adding(calcCargoItemMass(item))
    }
    return mass
}

export function calcStacksMass(stacks: CargoStack[]): UInt64 {
    let mass = UInt64.from(0)
    for (const s of stacks) {
        mass = mass.adding(calcCargoItemMass(s))
    }
    return mass
}

export function availableCapacity(entity: StorageCapability): UInt64 {
    const cargoMass = calcCargoMass(entity)
    return entity.capacity.gt(cargoMass)
        ? UInt64.from(entity.capacity).subtracting(cargoMass)
        : UInt64.from(0)
}

export function availableCapacityFromMass(capacity: UInt64Type, cargoMass: UInt64Type): UInt64 {
    const cap = UInt64.from(capacity)
    const mass = UInt64.from(cargoMass)
    return cap.gt(mass) ? cap.subtracting(mass) : UInt64.from(0)
}

export function hasSpace(entity: StorageCapability, goodMass: UInt64, quantity: number): boolean {
    const additional = goodMass.multiplying(quantity)
    return availableCapacity(entity).gte(additional)
}

export function hasSpaceForMass(
    capacity: UInt64Type,
    currentMass: UInt64Type,
    additionalMass: UInt64Type
): boolean {
    return UInt64.from(currentMass).adding(additionalMass).lte(capacity)
}

export function isFull(entity: HasCapacity & HasCargomass): boolean {
    return UInt64.from(entity.cargomass).gte(entity.capacity)
}

export function isFullFromMass(capacity: UInt64Type, cargoMass: UInt64Type): boolean {
    return UInt64.from(cargoMass).gte(capacity)
}

export interface CargoStack {
    item_id: UInt16
    quantity: UInt32
    seed?: UInt64
    modules: ServerContract.Types.module_entry[]
}

export function cargoItemToStack(item: ServerContract.Types.cargo_item): CargoStack {
    return {
        item_id: UInt16.from(item.item_id),
        quantity: UInt32.from(item.quantity),
        seed: item.seed,
        modules: item.modules ?? [],
    }
}

export function stackToCargoItem(stack: CargoStack): ServerContract.Types.cargo_item {
    return ServerContract.Types.cargo_item.from({
        item_id: stack.item_id,
        quantity: stack.quantity,
        seed: stack.seed,
        modules: stack.modules,
    })
}

function seedEquals(a?: UInt64, b?: UInt64): boolean {
    if (!a && !b) return true
    if (!a || !b) return false
    return a.equals(b)
}

function stackIdentityEqual(a: CargoStack, b: CargoStack): boolean {
    return a.item_id.equals(b.item_id) && seedEquals(a.seed, b.seed)
}

export function stackKey(s: CargoStack): string {
    const seedVal = s.seed ? s.seed.toString() : '0'
    return `${s.item_id.toNumber()}:${seedVal}`
}

export function stacksEqual(a: CargoStack, b: CargoStack): boolean {
    return stackIdentityEqual(a, b) && a.quantity.equals(b.quantity)
}

export function mergeStacks(stacks: CargoStack[], add: CargoStack): CargoStack[] {
    const idx = stacks.findIndex((s) => stackIdentityEqual(s, add))
    if (idx === -1) {
        return [...stacks, {...add}]
    }
    const result = stacks.slice()
    result[idx] = {
        ...result[idx],
        quantity: UInt32.from(result[idx].quantity.adding(add.quantity)),
    }
    return result
}

export function removeFromStacks(stacks: CargoStack[], remove: CargoStack): CargoStack[] {
    const idx = stacks.findIndex((s) => stackIdentityEqual(s, remove))
    if (idx === -1) {
        throw new Error(INSUFFICIENT_ITEM_QUANTITY)
    }
    const target = stacks[idx]
    if (target.quantity.lt(remove.quantity)) {
        throw new Error(INSUFFICIENT_ITEM_QUANTITY)
    }
    const remaining = UInt32.from(target.quantity.subtracting(remove.quantity))
    if (remaining.equals(UInt32.from(0))) {
        return [...stacks.slice(0, idx), ...stacks.slice(idx + 1)]
    }
    const result = stacks.slice()
    result[idx] = {...target, quantity: remaining}
    return result
}
