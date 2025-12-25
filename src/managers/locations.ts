import {Bytes, Checksum256, UInt16Type, UInt64} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {CoordinatesType, Distance, GoodPrice} from '../types'
import {marketPrice, marketPrices} from '../market/market'
import {hasSystem} from '../utils/system'
import {findNearbyPlanets} from '../travel/travel'
import {Location, toLocation} from '../entities/location'

export class LocationsManager extends BaseManager {
    async getMarketPrice(location: CoordinatesType, goodId: number): Promise<GoodPrice> {
        const game = await this.getGame()
        const state = await this.getState()
        return marketPrice(location, goodId, game.config.seed, state)
    }

    async getMarketPrices(location: CoordinatesType): Promise<GoodPrice[]> {
        const game = await this.getGame()
        const state = await this.getState()
        return marketPrices(location, game.config.seed, state)
    }

    async getMarketPricesWithSupply(location: CoordinatesType): Promise<GoodPrice[]> {
        const [game, state, locationRows] = await Promise.all([
            this.getGame(),
            this.getState(),
            this.getLocation(location),
        ])

        const prices = marketPrices(location, game.config.seed, state)

        const supplyMap = new Map<number, number>()
        for (const row of locationRows) {
            if (UInt64.from(row.epoch).equals(state.epoch)) {
                supplyMap.set(Number(row.good_id), Number(row.supply))
            }
        }

        return prices.map((price) => {
            const actualSupply = supplyMap.get(Number(price.id))
            if (actualSupply !== undefined) {
                return GoodPrice.from({
                    id: price.id,
                    good: price.good,
                    price: price.price,
                    supply: UInt64.from(actualSupply),
                })
            }
            return price
        })
    }

    async hasSystem(location: CoordinatesType): Promise<boolean> {
        const game = await this.getGame()
        return hasSystem(game.config.seed, location)
    }

    async findNearbyPlanets(
        origin: CoordinatesType,
        maxDistance: UInt16Type = 20
    ): Promise<Distance[]> {
        const game = await this.getGame()
        return findNearbyPlanets(game.config.seed, origin, maxDistance)
    }

    async getLocation(location: CoordinatesType) {
        const hash = Checksum256.hash(Bytes.from(`${location.x}-${location.y}`, 'utf8'))
        return this.server.table('location').all({
            index_position: 'secondary',
            from: hash,
            to: hash,
        })
    }

    async getLocationWithPrices(coords: CoordinatesType): Promise<Location> {
        const location = toLocation(coords)
        const prices = await this.getMarketPrices(location.coordinates)
        location.setMarketPrices(prices)
        return location
    }

    async getLocationWithSupply(coords: CoordinatesType): Promise<Location> {
        const location = toLocation(coords)
        const [rows, state] = await Promise.all([
            this.getLocation(location.coordinates),
            this.getState(),
        ])
        location.setLocationRows(rows, state.epoch)
        return location
    }

    async getLocationComplete(coords: CoordinatesType): Promise<Location> {
        const location = toLocation(coords)
        const [prices, rows, state] = await Promise.all([
            this.getMarketPrices(location.coordinates),
            this.getLocation(location.coordinates),
            this.getState(),
        ])

        location.setMarketPrices(prices)
        location.setLocationRows(rows, state.epoch)
        return location
    }
}
