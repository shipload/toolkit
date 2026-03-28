import {Int64, Int64Type, UInt32, UInt32Type, UInt64} from '@wharfkit/antelope'
import {Ship} from '../entities/ship'
import {Player} from '../entities/player'
import {ItemPrice} from '../types'

/**
 * Trade calculation result
 */
export interface TradeCalculation {
    maxQuantity: number
    totalCost: number
    totalMass: UInt64
    affordableQuantity: number
    spaceForQuantity: number
}

/**
 * Calculate updated weighted average cargo cost after purchase.
 * Matches contract logic: (paid * owned + cost) / (owned + quantity)
 *
 * @param currentPaid - Current average cost per unit (from cargo.paid)
 * @param currentOwned - Current owned quantity
 * @param purchaseCost - Total cost of new purchase (price * quantity)
 * @param purchaseQuantity - Quantity being purchased
 * @returns New weighted average cost per unit
 *
 * @example
 * // Owned 10 units at 100 each, buying 5 more at 120 each
 * const newPaid = calculateUpdatedCargoCost(
 *     UInt64.from(100),
 *     UInt32.from(10),
 *     UInt64.from(600),
 *     UInt32.from(5)
 * )
 * // Result: (100*10 + 600) / (10+5) = 106.67 per unit
 */
export function calculateUpdatedCargoCost(
    currentPaid: UInt64,
    currentOwned: UInt32,
    purchaseCost: UInt64,
    purchaseQuantity: UInt32
): UInt64 {
    // Match contract: (paid * owned + cost) / (owned + quantity)
    const numerator = currentPaid.multiplying(currentOwned).adding(purchaseCost)
    const denominator = UInt32.from(currentOwned).adding(purchaseQuantity)
    return numerator.dividing(denominator)
}

/**
 * Calculate the maximum quantity of a good a ship can buy
 * considering both space and player balance
 */
export function calculateMaxTradeQuantity(
    ship: Ship,
    player: Player,
    goodPrice: ItemPrice
): TradeCalculation {
    const pricePerUnit = UInt32.from(goodPrice.price)
    const massPerUnit = UInt32.from(goodPrice.item.mass)

    const spaceForQuantity = ship.availableCapacity.dividing(massPerUnit)
    const affordableQuantity = player.balance.dividing(pricePerUnit)
    const maxQuantity = spaceForQuantity.lt(affordableQuantity)
        ? spaceForQuantity
        : affordableQuantity

    return {
        maxQuantity: Number(maxQuantity),
        totalCost: Number(maxQuantity.multiplying(pricePerUnit)),
        totalMass: UInt64.from(maxQuantity.multiplying(massPerUnit)),
        affordableQuantity: Number(affordableQuantity),
        spaceForQuantity: Number(spaceForQuantity),
    }
}

/**
 * Trade profit calculation result
 */
export interface TradeProfitResult {
    revenue: UInt64
    cost: UInt64
    profit: Int64
    margin: number
}

/**
 * Calculate profit for a trade route
 */
export function calculateTradeProfit(
    quantity: UInt32Type,
    buyPrice: UInt32Type,
    sellPrice: UInt32Type
): TradeProfitResult {
    const qty = UInt32.from(quantity)
    const buy = UInt32.from(buyPrice)
    const sell = UInt32.from(sellPrice)

    const cost = UInt64.from(qty).multiplying(buy)
    const revenue = UInt64.from(qty).multiplying(sell)
    const profit = Int64.from(revenue).subtracting(cost)
    const margin = cost.gt(UInt64.zero) ? (Number(profit) / Number(cost)) * 100 : 0

    return {revenue, cost, profit, margin}
}

/**
 * Calculate profit per unit of mass
 */
export function calculateProfitPerMass(
    quantity: number,
    buyPrice: number,
    sellPrice: number,
    massPerUnit: number
): number {
    const profit = (sellPrice - buyPrice) * quantity
    const totalMass = quantity * massPerUnit
    return totalMass > 0 ? profit / totalMass : 0
}

/**
 * Calculate profit per second for a trade route
 */
export function calculateProfitPerSecond(profit: Int64Type, travelTimeSeconds: UInt32Type): number {
    const t = UInt32.from(travelTimeSeconds)
    return t.gt(UInt32.zero) ? Number(profit) / Number(t) : 0
}

/**
 * Find the best good to trade between two locations
 */
export function findBestItemToTrade(
    ship: Ship,
    player: Player,
    originPrices: ItemPrice[],
    destPrices: ItemPrice[],
    travelTimeSeconds: UInt32Type
): {
    item: ItemPrice
    quantity: number
    profit: number
    profitPerSecond: number
    margin: number
} | null {
    let bestTrade: {
        item: ItemPrice
        quantity: number
        profit: number
        profitPerSecond: number
        margin: number
    } | null = null
    let bestProfitPerSecond = 0

    for (const originPrice of originPrices) {
        const destPrice = destPrices.find((p) => p.id.equals(originPrice.id))
        if (!destPrice) continue

        if (!isProfitable(originPrice.price, destPrice.price)) continue

        const calc = calculateMaxTradeQuantity(ship, player, originPrice)
        if (calc.maxQuantity === 0) continue

        const tradeResult = calculateTradeProfit(
            calc.maxQuantity,
            originPrice.price,
            destPrice.price
        )
        const profitPerSecond = calculateProfitPerSecond(tradeResult.profit, travelTimeSeconds)

        if (profitPerSecond > bestProfitPerSecond) {
            bestProfitPerSecond = profitPerSecond
            bestTrade = {
                item: originPrice,
                quantity: calc.maxQuantity,
                profit: Number(tradeResult.profit),
                profitPerSecond,
                margin: tradeResult.margin,
            }
        }
    }

    return bestTrade
}

/**
 * Calculate break-even price for selling cargo
 */
export function calculateBreakEvenPrice(costPaid: number, quantity: number): number {
    return quantity > 0 ? costPaid / quantity : 0
}

/**
 * Check if a trade is profitable
 */
export function isProfitable(buyPrice: UInt32Type, sellPrice: UInt32Type): boolean {
    return UInt32.from(sellPrice).gt(UInt32.from(buyPrice))
}

/**
 * Calculate return on investment percentage
 */
export function calculateROI(cost: number, profit: number): number {
    return cost > 0 ? (profit / cost) * 100 : 0
}
