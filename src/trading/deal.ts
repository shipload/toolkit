import {Int64, UInt16, UInt32, UInt64, UInt64Type} from '@wharfkit/antelope'
import {Coordinates, GoodPrice, PRECISION, ShipLike} from '../types'
import {Location} from '../entities/location'
import {Ship} from '../entities/ship'
import {
    distanceBetweenCoordinates,
    type EstimatedTravelTime,
    estimateTravelTime,
    hasEnergyForDistance,
} from '../travel/travel'
import {calculateProfitPerSecond, calculateTradeProfit, isProfitable} from './trade'

/**
 * Trading deal interface representing a profitable trade opportunity
 */
export interface Deal {
    /** Origin location */
    origin: Location
    /** Destination location */
    destination: Location
    /** Good to trade */
    good: GoodPrice
    /** Distance between origin and destination */
    distance: UInt64
    /** Available supply at origin */
    supply: UInt16
    /** Buy price at origin */
    buyPrice: UInt32
    /** Sell price at destination */
    sellPrice: UInt32
    /** Profit per unit */
    profitPerUnit: UInt32
    /** Maximum quantity that can be traded */
    maxQuantity: UInt32
    /** Total profit for max quantity */
    totalProfit: Int64
    /** Estimated travel time in seconds */
    travelTime: UInt32
    /** Detailed breakdown of travel time components */
    travelTimeBreakdown: EstimatedTravelTime
    /** Profit per second (floating point for UI display) */
    profitPerSecond: number
    /** Profit margin percentage (floating point for UI display) */
    marginPercent: number
}

/**
 * Options for finding deals
 */
export interface FindDealsOptions {
    /** Maximum number of deals to return */
    maxDeals?: number
    /** Maximum search distance */
    maxDistance?: number
    /** Player's current balance (for affordability filtering) */
    playerBalance?: UInt64Type
    /** Minimum profit per second threshold */
    minProfitPerSecond?: number
    /** Minimum profit margin percentage */
    minMarginPercent?: number
    /** Override available cargo space (in mass units). If provided, uses this instead of calculating from ship's current cargo. */
    availableSpace?: number
}

/**
 * Calculate deals for a ship from a specific origin location
 */
export async function findDealsForShip(
    ship: Ship,
    originLocation: Coordinates,
    getNearbyLocations: (origin: Coordinates, maxDistance: number) => Promise<Location[]>,
    getMarketPrices: (location: Coordinates) => Promise<GoodPrice[]>,
    options: FindDealsOptions = {}
): Promise<Deal[]> {
    const {
        maxDeals = 10,
        maxDistance = 20 * PRECISION,
        playerBalance,
        minProfitPerSecond = 0,
        minMarginPercent = 0,
        availableSpace,
    } = options

    const balance = playerBalance !== undefined ? UInt64.from(playerBalance) : undefined

    const origin = Location.from(originLocation)
    const originPrices = await getMarketPrices(originLocation)
    origin.setMarketPrices(originPrices)

    // Get nearby locations
    const nearbyLocations = await getNearbyLocations(originLocation, maxDistance)

    const deals: Deal[] = []
    const currentMass = ship.totalMass
    const shipCapacity = ship.maxCapacity
    const effectiveAvailableMass =
        availableSpace !== undefined
            ? UInt64.from(availableSpace)
            : currentMass.lt(shipCapacity)
            ? shipCapacity.subtracting(currentMass)
            : UInt64.zero

    // Check each nearby location
    for (const destLocation of nearbyLocations) {
        const destinationPrices = await getMarketPrices(destLocation.coordinates)
        destLocation.setMarketPrices(destinationPrices)

        const distance = distanceBetweenCoordinates(originLocation, destLocation.coordinates)

        // Compare prices for each good
        for (const originGood of originPrices) {
            const destGood = destinationPrices.find((g) => g.id.equals(originGood.id))
            if (!destGood) continue

            if (
                !isProfitable(originGood.price, destGood.price) ||
                originGood.supply.equals(UInt16.from(0))
            ) {
                continue
            }

            // Calculate max quantity based on balance, cargo space, and supply
            const canAfford =
                balance !== undefined
                    ? balance.dividing(originGood.price)
                    : UInt64.from(Number.MAX_SAFE_INTEGER)
            const canHaul = effectiveAvailableMass.dividing(originGood.good.mass)
            const supplyLimit = UInt64.from(originGood.supply)

            // Find minimum of canAfford, canHaul, supplyLimit
            let maxQuantity = canAfford
            if (canHaul.lt(maxQuantity)) maxQuantity = canHaul
            if (supplyLimit.lt(maxQuantity)) maxQuantity = supplyLimit

            if (maxQuantity.equals(UInt64.zero)) continue

            // Calculate travel time with cargo (includes recharge + load time)
            const cargoMass = originGood.good.mass.multiplying(maxQuantity)
            const availableSpaceUInt = UInt64.from(availableSpace)
            const baseMass =
                availableSpace !== undefined
                    ? shipCapacity.gte(availableSpaceUInt)
                        ? shipCapacity.subtracting(availableSpaceUInt)
                        : UInt64.zero
                    : currentMass
            const totalMass = baseMass.adding(cargoMass)
            const needsRecharge = !ship.hasEnergyFor(distance)
            const travelEstimate = estimateTravelTime(ship as ShipLike, totalMass, distance, {
                needsRecharge,
                loadMass: Number(cargoMass),
            })

            // Calculate profitability metrics using trade.ts functions
            const tradeCalc = calculateTradeProfit(maxQuantity, originGood.price, destGood.price)
            const profitPerUnit = destGood.price.subtracting(originGood.price)
            const profitPerSecond = calculateProfitPerSecond(tradeCalc.profit, travelEstimate.total)

            // Apply filters
            if (profitPerSecond < minProfitPerSecond) continue
            if (tradeCalc.margin < minMarginPercent) continue

            deals.push({
                origin,
                destination: destLocation,
                good: originGood,
                distance,
                supply: originGood.supply,
                buyPrice: originGood.price,
                sellPrice: destGood.price,
                profitPerUnit,
                maxQuantity: UInt32.from(maxQuantity),
                totalProfit: tradeCalc.profit,
                travelTime: travelEstimate.total,
                travelTimeBreakdown: travelEstimate,
                profitPerSecond,
                marginPercent: tradeCalc.margin,
            })
        }
    }

    // Sort by profit per second (descending)
    deals.sort((a, b) => b.profitPerSecond - a.profitPerSecond)

    return deals.slice(0, maxDeals)
}

/**
 * Find the single best deal for a ship from a specific origin location
 */
export async function findBestDeal(
    ship: Ship,
    originLocation: Coordinates,
    getNearbyLocations: (origin: Coordinates, maxDistance: number) => Promise<Location[]>,
    getMarketPrices: (location: Coordinates) => Promise<GoodPrice[]>,
    options: FindDealsOptions = {}
): Promise<Deal | undefined> {
    const deals = await findDealsForShip(
        ship,
        originLocation,
        getNearbyLocations,
        getMarketPrices,
        {
            ...options,
            maxDeals: 1,
        }
    )
    return deals[0]
}
