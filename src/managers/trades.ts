import {UInt64} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {Ship} from '../entities/ship'
import {Deal, findDealsForShip, FindDealsOptions} from '../trading/deal'
import {
    analyzeCollectOptions,
    CollectAnalysis,
    CollectAnalysisCallbacks,
    CollectAnalysisOptions,
} from '../trading/collect'
import {Coordinates, ItemPrice} from '../types'
import {Location, toLocation} from '../entities/location'
import {findNearbyPlanets} from '../travel/travel'
import {getCurrentEpoch} from '../scheduling/epoch'

export class TradesManager extends BaseManager {
    private priceCache = new Map<string, ItemPrice[]>()
    private priceCacheEpoch: UInt64 | undefined

    private makePriceCacheKey(location: Coordinates): string {
        return `${location.x},${location.y}`
    }

    private async createCallbacks(): Promise<CollectAnalysisCallbacks> {
        const game = await this.getGame()
        const serverState = await this.getState()
        const currentEpoch = getCurrentEpoch(game)

        if (!this.priceCacheEpoch || !this.priceCacheEpoch.equals(currentEpoch)) {
            this.priceCache.clear()
            this.priceCacheEpoch = currentEpoch
        }

        const getNearbyLocations = async (
            origin: Coordinates,
            maxDistance: number
        ): Promise<Location[]> => {
            const nearby = findNearbyPlanets(game.config.seed, origin, maxDistance)
            return nearby.map((d) => toLocation(d.destination))
        }

        const getMarketPrices = async (location: Coordinates): Promise<ItemPrice[]> => {
            const cacheKey = this.makePriceCacheKey(location)
            const cached = this.priceCache.get(cacheKey)
            if (cached) {
                return cached
            }

            const locationWithSupply = await this.context.locations.getLocationComplete(location)
            const prices = locationWithSupply.marketPrices || []

            const result = prices.map((price) => {
                const actualSupply = locationWithSupply.getSupply(price.id)

                if (actualSupply !== undefined) {
                    return ItemPrice.from({
                        id: price.id,
                        item: price.item,
                        price: price.price,
                        supply: actualSupply,
                    })
                }
                return price
            })

            this.priceCache.set(cacheKey, result)
            return result
        }

        const getGameSeed = () => game.config.seed
        const getState = () => serverState

        return {getNearbyLocations, getMarketPrices, getGameSeed, getState}
    }

    clearPriceCache(): void {
        this.priceCache.clear()
        this.priceCacheEpoch = undefined
    }

    async findDeals(
        ship: Ship,
        originLocation?: Coordinates,
        options: FindDealsOptions = {}
    ): Promise<Deal[]> {
        const origin = originLocation || Coordinates.from(ship.coordinates)
        const callbacks = await this.createCallbacks()

        const deals = await findDealsForShip(
            ship,
            origin,
            callbacks.getNearbyLocations,
            callbacks.getMarketPrices,
            options
        )

        return deals
    }

    async findBestDeal(
        ship: Ship,
        originLocation?: Coordinates,
        options: FindDealsOptions = {}
    ): Promise<Deal | undefined> {
        const deals = await this.findDeals(ship, originLocation, {...options, maxDeals: 1})
        return deals[0]
    }

    async getCollectOptions(
        ship: Ship,
        arrivedAt?: Coordinates,
        options: CollectAnalysisOptions = {}
    ): Promise<CollectAnalysis> {
        const location = arrivedAt || Coordinates.from(ship.coordinates)
        const callbacks = await this.createCallbacks()

        return analyzeCollectOptions(ship, location, callbacks, options)
    }
}
