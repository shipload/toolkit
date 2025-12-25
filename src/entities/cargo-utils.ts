import {UInt64, UInt64Type} from '@wharfkit/antelope'
import {EntityInventory} from './entity-inventory'

export interface CargoData {
    cargo: EntityInventory[]
}

export function totalCargoMass(cargo: EntityInventory[]): UInt64 {
    return cargo.reduce((sum, c) => {
        return sum.adding(c.totalMass)
    }, UInt64.from(0))
}

export function cargoValue(cargo: EntityInventory[]): UInt64 {
    return cargo.reduce((sum, c) => {
        return sum.adding(c.totalCost)
    }, UInt64.from(0))
}

export function getCargoForGood(
    cargo: EntityInventory[],
    goodId: UInt64Type
): EntityInventory | undefined {
    return cargo.find((c) => c.good_id.equals(goodId))
}

export function hasSpace(
    currentMass: UInt64,
    maxCapacity: UInt64,
    goodMass: UInt64,
    quantity: number
): boolean {
    const additionalMass = goodMass.multiplying(quantity)
    const totalMass = currentMass.adding(additionalMass)
    return totalMass.lte(maxCapacity)
}

export function availableCapacity(currentMass: UInt64, maxCapacity: UInt64): UInt64 {
    if (currentMass.gte(maxCapacity)) {
        return UInt64.from(0)
    }
    return maxCapacity.subtracting(currentMass)
}

export function isFull(currentMass: UInt64, maxCapacity: UInt64): boolean {
    return currentMass.gte(maxCapacity)
}
