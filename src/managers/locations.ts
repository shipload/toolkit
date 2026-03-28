import {Bytes, Checksum256, UInt16Type, UInt64, UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {CoordinatesType, coordsToLocationId, Distance, ItemPrice} from '../types'
import {marketPrice, marketPrices} from '../market/market'
import {hasSystem} from '../utils/system'
import {findNearbyPlanets} from '../travel/travel'
import {Location, toLocation} from '../entities/location'
import {ServerContract} from '../contracts'

export class LocationsManager extends BaseManager {
    async getMarketPrice(location: CoordinatesType, goodId: number): Promise<ItemPrice> {
        const game = await this.getGame()
        const state = await this.getState()
        return marketPrice(location, goodId, game.config.seed, state)
    }

    async getMarketPrices(location: CoordinatesType): Promise<ItemPrice[]> {
        const game = await this.getGame()
        const state = await this.getState()
        return marketPrices(location, game.config.seed, state)
    }

    async getMarketPricesWithSupply(location: CoordinatesType): Promise<ItemPrice[]> {
        const [game, state, supplyRows] = await Promise.all([
            this.getGame(),
            this.getState(),
            this.getSupplyRows(location),
        ])

        const prices = marketPrices(location, game.config.seed, state)

        const supplyMap = new Map<number, number>()
        for (const row of supplyRows) {
            if (UInt64.from(row.epoch).equals(state.epoch)) {
                supplyMap.set(Number(row.item_id), Number(row.supply))
            }
        }

        return prices.map((price) => {
            const actualSupply = supplyMap.get(Number(price.id))
            if (actualSupply !== undefined) {
                return ItemPrice.from({
                    id: price.id,
                    item: price.item,
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

    async getSupplyRows(location: CoordinatesType) {
        const hash = Checksum256.hash(Bytes.from(`${location.x}-${location.y}`, 'utf8'))
        return this.server.table('supply').all({
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
            this.getSupplyRows(location.coordinates),
            this.getState(),
        ])
        location.setLocationRows(rows, state.epoch)
        return location
    }

    async getLocationComplete(coords: CoordinatesType): Promise<Location> {
        const location = toLocation(coords)
        const [prices, rows, state] = await Promise.all([
            this.getMarketPrices(location.coordinates),
            this.getSupplyRows(location.coordinates),
            this.getState(),
        ])

        location.setMarketPrices(prices)
        location.setLocationRows(rows, state.epoch)
        return location
    }

    async getLocationEntity(
        id: UInt64Type
    ): Promise<ServerContract.Types.location_row | undefined> {
        const row = await this.server.table('location').get(UInt64.from(id))
        return row ?? undefined
    }

    async getLocationEntityAt(
        coords: CoordinatesType
    ): Promise<ServerContract.Types.location_row | undefined> {
        const id = coordsToLocationId(coords)
        return this.getLocationEntity(id)
    }

    async getAllLocationEntities(): Promise<ServerContract.Types.location_row[]> {
        return this.server.table('location').all()
    }
}
