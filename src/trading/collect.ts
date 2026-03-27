import {Checksum256Type, Int64, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {Ship} from '../entities/ship'
import {Location} from '../entities/location'
import {Coordinates, GoodPrice, ShipLike} from '../types'
import {Deal, findDealsForShip} from './deal'

import {EntityInventory} from '../entities/entity-inventory'
import {
    calc_loader_flighttime,
    distanceBetweenCoordinates,
    EstimatedTravelTime,
    estimateTravelTime,
} from '../travel/travel'
import {getGood, getGoods} from '../market/goods'
import {getRarity, Rarities} from '../market/market'
import {ServerContract} from '../contracts'

/**
 * Calculate the mass of cargo (based on quantity).
 * Used for estimating unload time.
 */
function calculateCargoMass(cargo: EntityInventory[]): UInt32 {
    let mass = UInt32.from(0)
    for (const c of cargo) {
        if (UInt64.from(c.quantity).gt(UInt64.zero)) {
            const goodMass = getGood(c.good_id).mass
            mass = mass.adding(goodMass.multiplying(c.quantity))
        }
    }
    return mass
}

function calculateUnloadTime(
    ship: ServerContract.Types.entity_info,
    cargo: EntityInventory[]
): UInt32 {
    const unloadMass = calculateCargoMass(cargo)
    if (
        unloadMass.equals(UInt32.zero) ||
        !ship.loaders ||
        ship.loaders.quantity.equals(UInt32.zero)
    ) {
        return UInt32.zero
    }
    const totalMass = UInt64.from(unloadMass).adding(ship.loaders.mass)
    return calc_loader_flighttime(ship as ShipLike, totalMass).dividing(ship.loaders.quantity)
}

/**
 * Types of collect actions available to the player
 */
export type CollectActionType =
    | 'sell-and-trade' // arrive/sell/buy/travel - full loop
    | 'sell-and-reposition' // arrive/sell/refuel/travel - sell here, travel empty to deals
    | 'travel-to-sell' // arrive/refuel/travel - keep cargo, sell at better location
    | 'sell-and-stay' // arrive/sell - just sell, stay idle
    | 'explore' // arrive/refuel/travel - travel to find opportunities
    | 'orbit' // just arrive, keep cargo, decide later

/**
 * Represents a single collect option presented to the player
 */
export interface CollectOption {
    /** Unique identifier for this option */
    id: string
    /** Type of action sequence */
    type: CollectActionType
    /** Human-readable title */
    title: string
    /** Detailed description of what will happen */
    description: string
    /** Brief explanation of why this option is worth considering */
    reason: string
    /** Whether this is the recommended option (best profitPerSecond with quality threshold) */
    recommended: boolean
    /** Whether this option has the highest absolute profit (may differ from recommended) */
    highestProfit: boolean
    /** Estimated profit/loss from this action */
    estimatedProfit: UInt64
    /** Revenue from selling cargo (if applicable) */
    saleRevenue?: UInt64
    /** Cost of purchasing new cargo (if applicable) */
    purchaseCost?: UInt64
    /** Expected profit from the next trade (if applicable) */
    nextTradeProfit?: UInt64
    /** Profit per second for this option (floating point for display) */
    profitPerSecond?: number
    /** Margin percentage for the deal (floating point for display) */
    marginPercent?: number
    /** Destination location (if traveling) */
    destination?: Location
    /** Deal to execute (if buying goods) */
    deal?: Deal
    /** Sale location if different from current */
    saleLocation?: Location
    /** Price per unit at sale location */
    salePrice?: UInt32
    /** Price per unit at current location (for comparison) */
    currentPrice?: UInt32
    /** Estimated travel time in seconds (undefined = instant/no travel) */
    travelTime?: UInt32
    /** Detailed breakdown of travel time components */
    travelTimeBreakdown?: EstimatedTravelTime
    /** Info about a discounted good at the destination (for explore options) */
    discountedGood?: DiscountedGoodInfo
    /** Top potential deals available at destination (for explore options) */
    potentialDeals?: PotentialDeal[]
    /** Details of cargo being sold (if selling cargo) */
    cargoSale?: CargoSaleItem[]
    /** Total profit/loss from selling cargo */
    cargoProfitLoss?: Int64
}

/**
 * Analysis result for collect options
 */
export interface CollectAnalysis {
    /** Current location where ship arrived */
    arrivedAt: Coordinates
    /** Ship being analyzed */
    ship: Ship
    /** Current cargo on ship */
    cargo: EntityInventory[]
    /** Value of cargo if sold at current location */
    cargoValueHere: UInt64
    /** All available options, sorted by estimated profit */
    options: CollectOption[]
    /** Whether any profitable options exist */
    hasProfitableOptions: boolean
}

/**
 * Options for analyzing collect choices
 */
export interface CollectAnalysisOptions {
    /** Player's current balance (defaults to Infinity) */
    playerBalance?: number
    /** Maximum distance to search (defaults to ship's max range) */
    maxDistance?: number
    /** Minimum profit improvement to suggest traveling elsewhere to sell */
    minSaleImprovement?: number
}

/**
 * Find locations where current cargo could be sold for more
 */
export interface BetterSaleLocation {
    location: Location
    /** Price per unit at this location */
    price: UInt32
    /** Total revenue if sold here */
    revenue: UInt64
    /** Difference vs selling at current location */
    improvement: Int64
    /** Best deal available at this location after selling */
    bestDealAfterSale?: Deal
    /** Distance to this location */
    distance: UInt64
    /** Estimated travel time */
    travelTime: UInt32
    /** Detailed breakdown of travel time components */
    travelTimeBreakdown?: EstimatedTravelTime
}

/**
 * Find locations with good deals when current location has none
 */
export interface RepositionLocation {
    location: Location
    /** Best deal available at this location */
    bestDeal: Deal
    /** Distance to this location */
    distance: UInt64
    /** Estimated travel time */
    travelTime: UInt32
    /** Detailed breakdown of travel time components */
    travelTimeBreakdown?: EstimatedTravelTime
}

/**
 * Analyze cargo sale value at a specific location
 */
export function analyzeCargoSale(
    cargo: EntityInventory[],
    prices: Map<number, UInt64>
): {revenue: UInt64; cost: UInt64; profit: Int64} {
    let revenue = UInt64.zero
    let cost = UInt64.zero

    for (const c of cargo) {
        if (UInt64.from(c.quantity).equals(UInt64.zero)) continue

        const goodId = Number(c.good_id)
        const salePrice = prices.get(goodId)

        if (salePrice) {
            revenue = revenue.adding(UInt64.from(salePrice).multiplying(c.quantity))
        }

        cost = cost.adding(c.unit_cost.multiplying(c.quantity))
    }

    return {
        revenue,
        cost,
        profit: Int64.from(revenue).subtracting(cost),
    }
}

/**
 * Build cargo sale item details for UI display
 */
export function buildCargoSaleItems(
    cargo: EntityInventory[],
    prices: Map<number, UInt64>
): CargoSaleItem[] {
    const items: CargoSaleItem[] = []

    for (const c of cargo) {
        if (UInt64.from(c.quantity).equals(UInt64.zero)) continue

        const goodId = Number(c.good_id)
        const salePrice = prices.get(goodId)
        const pricePerUnit = salePrice ? UInt32.from(salePrice) : UInt32.zero
        const revenue = UInt64.from(pricePerUnit).multiplying(c.quantity)
        const cost = c.unit_cost.multiplying(c.quantity)
        const profit = Int64.from(revenue).subtracting(cost)

        items.push({
            goodId: c.good_id,
            goodName: c.good?.name ?? `Good #${goodId}`,
            quantity: UInt32.from(c.quantity),
            pricePerUnit,
            revenue,
            costPerUnit: c.unit_cost,
            profit,
        })
    }

    return items
}

/**
 * Create a "Sell & Trade" option (full loop)
 */
export function createSellAndTradeOption(
    saleRevenue: UInt64,
    saleCost: UInt64,
    deal: Deal,
    cargoSale?: CargoSaleItem[],
    unloadTime?: UInt32
): CollectOption {
    const saleProfit = Int64.from(saleRevenue).subtracting(saleCost)
    const totalProfit = saleProfit.adding(deal.totalProfit)
    const profitPerSecond = deal.travelTime.gt(UInt32.zero)
        ? Number(totalProfit) / Number(deal.travelTime)
        : Number(totalProfit)

    const unload = unloadTime ?? UInt32.zero
    const breakdown: EstimatedTravelTime | undefined = deal.travelTimeBreakdown
        ? {
              unloadTime: unload,
              loadTime: deal.travelTimeBreakdown.loadTime,
              rechargeTime: deal.travelTimeBreakdown.rechargeTime,
              flightTime: deal.travelTimeBreakdown.flightTime,
              total: unload
                  .adding(deal.travelTimeBreakdown.loadTime)
                  .adding(deal.travelTimeBreakdown.rechargeTime)
                  .adding(deal.travelTimeBreakdown.flightTime),
          }
        : undefined

    return {
        id: `sell-trade-${deal.destination.coordinates.x}-${deal.destination.coordinates.y}-${deal.good.id}`,
        type: 'sell-and-trade',
        title: `Trade ${deal.good.good.name}`,
        description: `Sell cargo, buy ${deal.maxQuantity} ${deal.good.good.name}, deliver to (${deal.destination.coordinates.x}, ${deal.destination.coordinates.y})`,
        reason: `${deal.marginPercent.toFixed(0)}% margin, ${deal.profitPerSecond.toFixed(
            1
        )}/s profit rate`,
        recommended: false,
        highestProfit: false,
        estimatedProfit: saleProfit,
        saleRevenue,
        purchaseCost: UInt64.from(deal.buyPrice).multiplying(deal.maxQuantity),
        nextTradeProfit: deal.totalProfit,
        profitPerSecond,
        marginPercent: deal.marginPercent,
        destination: deal.destination,
        deal,
        travelTime: breakdown?.total ?? deal.travelTime,
        travelTimeBreakdown: breakdown,
        cargoSale,
        cargoProfitLoss: saleProfit,
    }
}

/**
 * Create a "Travel to Sell" option (better market elsewhere)
 */
export function createTravelToSellOption(
    currentRevenue: UInt64,
    cargoCost: UInt64,
    betterSale: BetterSaleLocation,
    cargo: EntityInventory[],
    destPrices?: Map<number, UInt64>
): CollectOption {
    const totalQuantity = cargo.reduce((s, c) => s.adding(UInt64.from(c.quantity)), UInt64.zero)
    const currentPrice = totalQuantity.gt(UInt64.zero)
        ? UInt32.from(currentRevenue.dividing(totalQuantity))
        : UInt32.zero
    const priceIncrease = betterSale.price.gte(currentPrice)
        ? betterSale.price.subtracting(currentPrice)
        : UInt32.zero
    const hasDealAfter = !!betterSale.bestDealAfterSale

    const cargoSale = destPrices ? buildCargoSaleItems(cargo, destPrices) : undefined
    const cargoProfitLoss = cargoSale?.reduce((sum, item) => sum.adding(item.profit), Int64.zero)

    const saleProfit = Int64.from(betterSale.revenue).subtracting(cargoCost)
    const profitPerSecond = betterSale.travelTime.gt(UInt32.zero)
        ? Number(saleProfit) / Number(betterSale.travelTime)
        : Number(saleProfit)

    return {
        id: `travel-sell-${betterSale.location.coordinates.x}-${betterSale.location.coordinates.y}`,
        type: 'travel-to-sell',
        title: 'Move to Sell Nearby',
        description: `Keep cargo, travel to better market${hasDealAfter ? ', then trade' : ''}`,
        reason: `+${Number(priceIncrease).toLocaleString()}/unit better price${
            hasDealAfter ? ', good deals available there' : ''
        }`,
        recommended: false,
        highestProfit: false,
        estimatedProfit: betterSale.improvement,
        saleRevenue: betterSale.revenue,
        profitPerSecond,
        saleLocation: betterSale.location,
        salePrice: betterSale.price,
        currentPrice,
        destination: betterSale.location,
        deal: betterSale.bestDealAfterSale,
        travelTime: betterSale.travelTime,
        travelTimeBreakdown: betterSale.travelTimeBreakdown,
        cargoSale,
        cargoProfitLoss,
    }
}

/**
 * Create a "Sell & Reposition" option (sell here, travel empty to deals)
 */
export function createSellAndRepositionOption(
    saleRevenue: UInt64,
    saleCost: UInt64,
    reposition: RepositionLocation,
    cargoSale?: CargoSaleItem[]
): CollectOption {
    const saleProfit = Int64.from(saleRevenue).subtracting(saleCost)
    const deal = reposition.bestDeal

    return {
        id: `sell-reposition-${reposition.location.coordinates.x}-${reposition.location.coordinates.y}`,
        type: 'sell-and-reposition',
        title: 'Sell & Move',
        description: `Sell cargo here, travel empty to buy ${deal.good.good.name}`,
        reason: `No good trades here — ${deal.marginPercent.toFixed(
            0
        )}% margin trade available at destination`,
        recommended: false,
        highestProfit: false,
        estimatedProfit: saleProfit,
        saleRevenue,
        nextTradeProfit: deal.totalProfit,
        profitPerSecond: deal.profitPerSecond,
        marginPercent: deal.marginPercent,
        destination: reposition.location,
        deal: reposition.bestDeal,
        travelTime: reposition.travelTime,
        travelTimeBreakdown: reposition.travelTimeBreakdown,
        cargoSale,
        cargoProfitLoss: saleProfit,
    }
}

/**
 * Create an "Orbit" option (just arrive, keep cargo)
 */
export function createOrbitOption(): CollectOption {
    return {
        id: 'orbit',
        type: 'orbit',
        title: 'Enter Orbit',
        description: 'Arrive at this location, keep cargo',
        reason: 'Keep cargo, decide later',
        recommended: false,
        highestProfit: false,
        estimatedProfit: UInt64.zero,
    }
}

/**
 * Create a "Sell & Stay" option (just sell, stay idle)
 */
export function createSellAndStayOption(
    saleRevenue: UInt64,
    saleCost: UInt64,
    cargoSale?: CargoSaleItem[],
    unloadTime?: UInt32
): CollectOption {
    const saleProfit = Int64.from(saleRevenue).subtracting(saleCost)

    return {
        id: 'sell-stay',
        type: 'sell-and-stay',
        title: 'Sell & Enter Orbit',
        description: `Sell cargo, remain docked at this location`,
        reason: 'Collect profits now, decide next move later',
        recommended: false,
        highestProfit: false,
        estimatedProfit: saleProfit,
        saleRevenue,
        cargoSale,
        cargoProfitLoss: saleProfit,
        travelTimeBreakdown:
            unloadTime !== undefined
                ? {
                      unloadTime,
                      loadTime: UInt32.zero,
                      rechargeTime: UInt32.zero,
                      flightTime: UInt32.zero,
                      total: unloadTime,
                  }
                : undefined,
    }
}

/**
 * Details about a cargo item being sold
 */
export interface CargoSaleItem {
    goodId: UInt16
    goodName: string
    quantity: UInt32
    /** Price per unit at sale location */
    pricePerUnit: UInt32
    /** Total revenue from this item */
    revenue: UInt64
    /** Original cost (paid) per unit */
    costPerUnit: UInt64
    /** Profit/loss on this item */
    profit: Int64
}

/**
 * Info about a discounted good for explore options
 */
export interface DiscountedGoodInfo {
    goodId: number
    name: string
    rarity: string
    discountPercent: number
}

/**
 * A potential deal available at a destination (for explore options)
 */
export interface PotentialDeal {
    goodId: number
    goodName: string
    destinationCoords: Coordinates
    marginPercent: number
    profitPerSecond: number
}

/**
 * Create an "Explore" option (travel to find opportunities)
 */
export function createExploreOption(
    destination: Location,
    travelTime?: UInt32,
    discountedGood?: DiscountedGoodInfo,
    travelTimeBreakdown?: EstimatedTravelTime,
    potentialDeals?: PotentialDeal[]
): CollectOption {
    let description = 'Travel to look for trading opportunities'
    let reason = 'No profitable trades found nearby'

    if (potentialDeals && potentialDeals.length > 0) {
        const bestDeal = potentialDeals[0]
        description = `${potentialDeals.length} deal${
            potentialDeals.length > 1 ? 's' : ''
        } available — best: ${bestDeal.goodName}`
        reason = `${bestDeal.marginPercent.toFixed(0)}% margin, ${bestDeal.profitPerSecond.toFixed(
            1
        )}/s`
    } else if (discountedGood) {
        const {name, discountPercent} = discountedGood
        if (discountPercent >= 60) {
            description = `${name} at ${discountPercent}% off`
            reason = 'Legendary find — extremely rare opportunity'
        } else if (discountPercent >= 40) {
            description = `${name} at ${discountPercent}% off`
            reason = 'Epic deal — exceptional prices'
        } else if (discountPercent >= 23) {
            description = `${name} at ${discountPercent}% off`
            reason = 'Rare discount — well below market'
        } else if (discountPercent >= 8) {
            description = `${name} at ${discountPercent}% off`
            reason = `Good prices on ${name}`
        } else {
            description = `${name} slightly discounted`
            reason = 'Minor savings available'
        }
    }

    return {
        id: `explore-${destination.coordinates.x}-${destination.coordinates.y}`,
        type: 'explore',
        title: 'Move',
        description,
        reason,
        recommended: false,
        highestProfit: false,
        estimatedProfit: UInt64.zero,
        destination,
        travelTime,
        travelTimeBreakdown,
        discountedGood,
        potentialDeals,
    }
}

/**
 * Callbacks for collect analysis (provided by manager)
 */
export interface CollectAnalysisCallbacks {
    getNearbyLocations: (origin: Coordinates, maxDistance: number) => Promise<Location[]>
    getMarketPrices: (location: Coordinates) => Promise<GoodPrice[]>
    getGameSeed?: () => Checksum256Type
    getState?: () => ServerContract.Types.state_row
}

/**
 * Analyze all collect options for a ship that has arrived at its destination.
 * Returns all available options sorted by estimated profit.
 */
export async function analyzeCollectOptions(
    ship: Ship,
    arrivedAt: Coordinates,
    callbacks: CollectAnalysisCallbacks,
    options: CollectAnalysisOptions = {}
): Promise<CollectAnalysis> {
    const {playerBalance = Infinity, minSaleImprovement = 100} = options

    const cargo = ship.sellableCargo
    const hasCargo = cargo.length > 0

    const originPrices = await callbacks.getMarketPrices(arrivedAt)
    const priceMap = new Map<number, UInt64>(originPrices.map((p) => [Number(p.id), p.price]))

    const {revenue: cargoValueHere, cost: cargoCost} = analyzeCargoSale(cargo, priceMap)

    const cargoSaleHere = buildCargoSaleItems(cargo, priceMap)

    const collectOptions: CollectOption[] = []

    const maxDistance = options.maxDistance ?? Number(ship.maxDistance)
    const nearbyLocations = await callbacks.getNearbyLocations(arrivedAt, maxDistance)

    const dealsAtOrigin = await findDealsForShip(
        ship,
        arrivedAt,
        callbacks.getNearbyLocations,
        callbacks.getMarketPrices,
        {
            maxDeals: 5,
            maxDistance,
            playerBalance: playerBalance + Number(cargoValueHere),
            availableSpace: Number(ship.maxCapacity),
        }
    )

    if (hasCargo && dealsAtOrigin.length > 0) {
        const cargoGoodIds = new Set(cargo.map((c) => Number(c.good_id)))

        for (const deal of dealsAtOrigin.slice(0, 3)) {
            const dealGoodId = Number(deal.good.id)
            if (cargoGoodIds.has(dealGoodId)) {
                continue
            }
            const unloadTime = calculateUnloadTime(ship, cargo)
            const option = createSellAndTradeOption(
                cargoValueHere,
                cargoCost,
                deal,
                cargoSaleHere,
                unloadTime
            )
            collectOptions.push(option)
        }
    }

    if (hasCargo) {
        const locationsToCheck = nearbyLocations.slice(0, 10)
        const allDestPrices = await Promise.all(
            locationsToCheck.map((loc) => callbacks.getMarketPrices(loc.coordinates))
        )

        const candidateLocations: Array<{
            destLocation: Location
            destPriceMap: Map<number, UInt64>
            destRevenue: UInt64
            improvement: Int64
        }> = []

        for (let i = 0; i < locationsToCheck.length; i++) {
            const destLocation = locationsToCheck[i]
            const destPrices = allDestPrices[i]
            const destPriceMap = new Map<number, UInt64>(
                destPrices.map((p) => [Number(p.id), p.price])
            )

            const {revenue: destRevenue} = analyzeCargoSale(cargo, destPriceMap)
            const improvement = Int64.from(destRevenue).subtracting(cargoValueHere)

            if (improvement.gt(Int64.from(minSaleImprovement))) {
                candidateLocations.push({destLocation, destPriceMap, destRevenue, improvement})
            }
        }

        const betterSaleResults = await Promise.all(
            candidateLocations.map(
                async ({destLocation, destPriceMap, destRevenue, improvement}) => {
                    const distance = distanceBetweenCoordinates(arrivedAt, destLocation.coordinates)
                    const needsRecharge = !ship.hasEnergyFor(distance)
                    const travelEstimate = estimateTravelTime(
                        ship as ShipLike,
                        ship.totalMass,
                        distance,
                        {
                            needsRecharge,
                        }
                    )

                    const dealsAfterSale = await findDealsForShip(
                        ship,
                        destLocation.coordinates,
                        callbacks.getNearbyLocations,
                        callbacks.getMarketPrices,
                        {
                            maxDeals: 1,
                            maxDistance,
                            playerBalance: destRevenue,
                            availableSpace: Number(ship.maxCapacity),
                        }
                    )

                    return {
                        better: {
                            location: destLocation,
                            price: UInt32.from(
                                destRevenue.dividing(
                                    cargo.reduce((s, c) => s.adding(c.quantity), UInt64.zero)
                                )
                            ),
                            revenue: destRevenue,
                            improvement,
                            bestDealAfterSale: dealsAfterSale[0],
                            distance,
                            travelTime: travelEstimate.total,
                            travelTimeBreakdown: travelEstimate,
                        } as BetterSaleLocation,
                        destPriceMap,
                    }
                }
            )
        )

        const betterSaleLocations = betterSaleResults.sort(
            (a, b) => Number(b.better.improvement) - Number(a.better.improvement)
        )

        for (const {better, destPriceMap} of betterSaleLocations.slice(0, 2)) {
            const option = createTravelToSellOption(
                cargoValueHere,
                cargoCost,
                better,
                cargo,
                destPriceMap
            )
            collectOptions.push(option)
        }
    }

    if (hasCargo && dealsAtOrigin.length === 0) {
        const locationsToCheck = nearbyLocations.slice(0, 10)
        const allDealsAtDest = await Promise.all(
            locationsToCheck.map((destLocation) =>
                findDealsForShip(
                    ship,
                    destLocation.coordinates,
                    callbacks.getNearbyLocations,
                    callbacks.getMarketPrices,
                    {
                        maxDeals: 1,
                        maxDistance,
                        playerBalance: UInt64.from(playerBalance).adding(cargoValueHere),
                        availableSpace: Number(ship.maxCapacity),
                    }
                )
            )
        )

        const repositionLocations: RepositionLocation[] = []
        for (let i = 0; i < locationsToCheck.length; i++) {
            const destLocation = locationsToCheck[i]
            const dealsAtDest = allDealsAtDest[i]

            if (dealsAtDest.length > 0) {
                const distance = distanceBetweenCoordinates(arrivedAt, destLocation.coordinates)
                const needsRecharge = !ship.hasEnergyFor(distance)
                const travelEstimate = estimateTravelTime(
                    ship as ShipLike,
                    ship.totalMass,
                    distance,
                    {
                        needsRecharge,
                        unloadMass: calculateCargoMass(cargo),
                    }
                )

                repositionLocations.push({
                    location: destLocation,
                    bestDeal: dealsAtDest[0],
                    distance,
                    travelTime: travelEstimate.total,
                    travelTimeBreakdown: travelEstimate,
                })
            }
        }

        repositionLocations.sort((a, b) => b.bestDeal.profitPerSecond - a.bestDeal.profitPerSecond)

        for (const reposition of repositionLocations.slice(0, 2)) {
            const option = createSellAndRepositionOption(
                cargoValueHere,
                cargoCost,
                reposition,
                cargoSaleHere
            )
            collectOptions.push(option)
        }
    }

    if (hasCargo) {
        const unloadTime = calculateUnloadTime(ship, cargo)
        const sellAndStay = createSellAndStayOption(
            cargoValueHere,
            cargoCost,
            cargoSaleHere,
            unloadTime
        )
        collectOptions.push(sellAndStay)
    }

    if (!hasCargo && dealsAtOrigin.length > 0) {
        for (const deal of dealsAtOrigin.slice(0, 3)) {
            const option: CollectOption = {
                id: `trade-${deal.destination.coordinates.x}-${deal.destination.coordinates.y}-${deal.good.id}`,
                type: 'sell-and-trade',
                title: `Trade ${deal.good.good.name}`,
                description: `Buy ${deal.maxQuantity} ${deal.good.good.name}, deliver to (${deal.destination.coordinates.x}, ${deal.destination.coordinates.y})`,
                reason: `${deal.marginPercent.toFixed(0)}% margin, ${deal.profitPerSecond.toFixed(
                    1
                )}/s profit rate`,
                recommended: false,
                highestProfit: false,
                estimatedProfit: deal.totalProfit,
                purchaseCost: UInt64.from(deal.buyPrice).multiplying(deal.maxQuantity),
                nextTradeProfit: deal.totalProfit,
                profitPerSecond: deal.profitPerSecond,
                marginPercent: deal.marginPercent,
                destination: deal.destination,
                deal,
                travelTime: deal.travelTime,
                travelTimeBreakdown: {
                    unloadTime: UInt32.zero,
                    loadTime: deal.travelTimeBreakdown.loadTime,
                    rechargeTime: deal.travelTimeBreakdown.rechargeTime,
                    flightTime: deal.travelTimeBreakdown.flightTime,
                    total: deal.travelTimeBreakdown.total,
                },
            }
            collectOptions.push(option)
        }
    }

    if (collectOptions.length === 0) {
        const gameSeed = callbacks.getGameSeed?.()
        const state = callbacks.getState?.()

        interface ExploreCandidate {
            dest: Location
            travelTime: UInt32
            travelTimeBreakdown: EstimatedTravelTime
            discountedGood?: DiscountedGoodInfo
            bestDiscount: number
            potentialDeals?: PotentialDeal[]
            score: number
        }

        const exploreCandidates: ExploreCandidate[] = []

        for (const dest of nearbyLocations.slice(0, 10)) {
            const distance = distanceBetweenCoordinates(arrivedAt, dest.coordinates)
            const needsRecharge = !ship.hasEnergyFor(distance)
            const unloadMass = hasCargo ? calculateCargoMass(cargo) : UInt32.zero
            const travelEstimate = estimateTravelTime(ship as ShipLike, ship.totalMass, distance, {
                needsRecharge,
                unloadMass,
            })

            let discountedGood: DiscountedGoodInfo | undefined
            let bestDiscount = 0

            if (gameSeed && state) {
                const allGoods = getGoods()
                for (const good of allGoods) {
                    const rarity = getRarity(gameSeed, state.seed, dest.coordinates, good.id)
                    if (rarity.minMultiplier < 1.0) {
                        const discountPercent = Math.round((1 - rarity.minMultiplier) * 100)
                        if (discountPercent > bestDiscount) {
                            bestDiscount = discountPercent
                            const rarityName =
                                rarity.rarity === Rarities.legendary
                                    ? 'Legendary'
                                    : rarity.rarity === Rarities.epic
                                    ? 'Epic'
                                    : rarity.rarity === Rarities.rare
                                    ? 'Rare'
                                    : rarity.rarity === Rarities.uncommon
                                    ? 'Uncommon'
                                    : 'Common'
                            discountedGood = {
                                goodId: Number(good.id),
                                name: good.name,
                                rarity: rarityName,
                                discountPercent,
                            }
                        }
                    }
                }
            }

            const destDeals = await findDealsForShip(
                ship,
                dest.coordinates,
                callbacks.getNearbyLocations,
                callbacks.getMarketPrices,
                {maxDeals: 2}
            )

            const potentialDeals: PotentialDeal[] = destDeals.map((d) => ({
                goodId: Number(d.good.id),
                goodName: d.good.good.name,
                destinationCoords: d.destination.coordinates,
                marginPercent: d.marginPercent,
                profitPerSecond: d.profitPerSecond,
            }))

            let score = 0
            if (potentialDeals.length > 0) {
                score = potentialDeals[0].profitPerSecond
            } else if (bestDiscount > 0) {
                score = bestDiscount * 0.01
            }

            exploreCandidates.push({
                dest,
                travelTime: travelEstimate.total,
                travelTimeBreakdown: travelEstimate,
                discountedGood,
                bestDiscount,
                potentialDeals: potentialDeals.length > 0 ? potentialDeals : undefined,
                score,
            })
        }

        exploreCandidates.sort((a, b) => b.score - a.score)

        for (const candidate of exploreCandidates.slice(0, 3)) {
            const option = createExploreOption(
                candidate.dest,
                candidate.travelTime,
                candidate.discountedGood,
                candidate.travelTimeBreakdown,
                candidate.potentialDeals
            )
            collectOptions.push(option)
        }
    }

    const orbitOption = createOrbitOption()
    collectOptions.push(orbitOption)

    const MIN_MARGIN_THRESHOLD = 15
    const MIN_PROFIT_PER_SECOND_THRESHOLD = 0.5

    collectOptions.sort((a, b) => (b.profitPerSecond ?? 0) - (a.profitPerSecond ?? 0))

    if (collectOptions.length > 0) {
        const bestByProfitPerSecond = collectOptions[0]
        const meetsQualityThreshold =
            (bestByProfitPerSecond.marginPercent ?? 0) > MIN_MARGIN_THRESHOLD ||
            (bestByProfitPerSecond.profitPerSecond ?? 0) > MIN_PROFIT_PER_SECOND_THRESHOLD

        if (meetsQualityThreshold) {
            bestByProfitPerSecond.recommended = true
        }

        const bestByProfit = collectOptions.reduce((best, opt) =>
            opt.estimatedProfit > best.estimatedProfit ? opt : best
        )
        if (bestByProfit.id !== bestByProfitPerSecond.id || !meetsQualityThreshold) {
            bestByProfit.highestProfit = true
        }
    }

    return {
        arrivedAt,
        ship,
        cargo,
        cargoValueHere,
        options: collectOptions,
        hasProfitableOptions: collectOptions.some((o) => o.estimatedProfit.gt(UInt64.zero)),
    }
}
