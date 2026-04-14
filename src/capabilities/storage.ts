import {UInt32, UInt64, UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {StorageCapability} from '../types/capabilities'
import {getItem} from '../market/items'

export interface HasCargo {
    cargo: ServerContract.Types.cargo_item[]
}

export interface HasCapacity {
    capacity: UInt32
}

export interface HasCargomass {
    cargomass: UInt32
}

export function calcCargoItemMass(item: ServerContract.Types.cargo_item): UInt64 {
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
