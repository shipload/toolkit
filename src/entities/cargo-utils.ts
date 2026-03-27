import {UInt32, UInt64, UInt64Type} from '@wharfkit/antelope'
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

export interface SaleValue {
    revenue: UInt64
    profit: UInt64
    cost: UInt64
}

export function calculateSaleValue(
    cargo: ServerContract.Types.cargo_item[],
    prices: Map<number, UInt64>
): SaleValue {
    if (cargo.length === 0) {
        return {revenue: UInt64.from(0), profit: UInt64.from(0), cost: UInt64.from(0)}
    }

    let revenue = UInt64.from(0)
    let cost = UInt64.from(0)

    for (const item of cargo) {
        if (UInt32.from(item.quantity).equals(UInt32.from(0))) continue

        const goodId = Number(item.good_id)
        const salePrice = prices.get(goodId)

        if (salePrice) {
            revenue = revenue.adding(salePrice.multiplying(item.quantity))
        }

        cost = cost.adding(item.unit_cost.multiplying(item.quantity))
    }

    const profit = revenue.gte(cost) ? revenue.subtracting(cost) : UInt64.from(0)

    return {
        revenue,
        profit,
        cost,
    }
}

export function calculateSaleValueFromArray(
    cargo: ServerContract.Types.cargo_item[],
    prices: UInt64[]
): SaleValue {
    const priceMap = new Map<number, UInt64>()
    prices.forEach((price, index) => {
        priceMap.set(index, price)
    })
    return calculateSaleValue(cargo, priceMap)
}

export function afterSellGoods(
    cargo: ServerContract.Types.cargo_item[],
    goodsToSell: Array<{goodId: number; quantity: number}>
): EntityInventory[] {
    if (cargo.length === 0) {
        return []
    }

    return cargo.map((item) => {
        const saleItem = goodsToSell.find((s) => Number(item.good_id) === s.goodId)
        if (!saleItem) {
            return new EntityInventory(item)
        }

        const currentQty = Number(item.quantity)
        const newQty = Math.max(0, currentQty - saleItem.quantity)

        return new EntityInventory(
            ServerContract.Types.cargo_item.from({
                good_id: item.good_id,
                quantity: UInt32.from(newQty),
                unit_cost: item.unit_cost,
            })
        )
    })
}

export function afterSellAllGoods(cargo: ServerContract.Types.cargo_item[]): EntityInventory[] {
    if (cargo.length === 0) {
        return []
    }

    return cargo.map(
        (item) =>
            new EntityInventory(
                ServerContract.Types.cargo_item.from({
                    good_id: item.good_id,
                    quantity: UInt32.from(0),
                    unit_cost: item.unit_cost,
                })
            )
    )
}
