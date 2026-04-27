import {UInt32, UInt64, type UInt64Type} from '@wharfkit/antelope'
import {EntityInventory} from './entity-inventory'
import {ServerContract} from '../contracts'

export interface CargoData {
    cargo: EntityInventory[]
}

export function totalCargoMass(cargo: EntityInventory[]): UInt64 {
    return cargo.reduce((sum, c) => {
        return sum.adding(c.totalMass)
    }, UInt64.from(0))
}

export function getCargoForItem(
    cargo: EntityInventory[],
    goodId: UInt64Type
): EntityInventory | undefined {
    return cargo.find((c) => c.item_id.equals(goodId))
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

export function afterRemoveItems(
    cargo: ServerContract.Types.cargo_item[],
    goodsToRemove: Array<{goodId: number; quantity: number}>
): EntityInventory[] {
    if (cargo.length === 0) {
        return []
    }

    return cargo.map((item) => {
        const removeItem = goodsToRemove.find((s) => Number(item.item_id) === s.goodId)
        if (!removeItem) {
            return new EntityInventory(item)
        }

        const currentQty = Number(item.quantity)
        const newQty = Math.max(0, currentQty - removeItem.quantity)

        return new EntityInventory(
            ServerContract.Types.cargo_item.from({
                item_id: item.item_id,
                quantity: UInt32.from(newQty),
            })
        )
    })
}

export function afterRemoveAllItems(cargo: ServerContract.Types.cargo_item[]): EntityInventory[] {
    if (cargo.length === 0) {
        return []
    }

    return cargo.map(
        (item) =>
            new EntityInventory(
                ServerContract.Types.cargo_item.from({
                    item_id: item.item_id,
                    quantity: UInt32.from(0),
                })
            )
    )
}
