import {Checksum256, Checksum256Type, UInt16, UInt16Type, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {Coordinates, CoordinatesType, Distance, ItemPrice, LocationType} from '../types'
import {getLocationType, hasSystem, isExtractableLocation} from '../utils/system'
import {findNearbyPlanets} from '../travel/travel'

/**
 * Location helper class for working with game coordinates.
 * Provides system detection, market price caching, nearby planet finding, and supply tracking.
 */
export class Location {
    readonly coordinates: Coordinates
    private _marketPrices?: ItemPrice[]
    private _gameSeed?: Checksum256
    private _hasSystem?: boolean
    private _locationRows?: ServerContract.Types.supply_row[]
    private _epoch?: UInt64

    constructor(coordinates: CoordinatesType) {
        this.coordinates = Coordinates.from(coordinates)
    }

    /**
     * Create a Location from coordinates
     */
    static from(coordinates: CoordinatesType): Location {
        return new Location(Coordinates.from(coordinates))
    }

    /**
     * Check if this location has a system (planet, asteroid, or nebula)
     */
    hasSystemAt(gameSeed: Checksum256Type): boolean {
        const seed = Checksum256.from(gameSeed)
        if (this._hasSystem === undefined || !this._gameSeed?.equals(seed)) {
            this._gameSeed = seed
            this._hasSystem = hasSystem(seed, this.coordinates)
        }
        return this._hasSystem
    }

    /**
     * Get the location type (EMPTY, PLANET, ASTEROID, or NEBULA)
     */
    getLocationTypeAt(gameSeed: Checksum256Type): LocationType {
        return getLocationType(gameSeed, this.coordinates)
    }

    /**
     * Check if this location is extractable (asteroid or nebula)
     */
    isExtractableAt(gameSeed: Checksum256Type): boolean {
        return isExtractableLocation(this.getLocationTypeAt(gameSeed))
    }

    /**
     * Set cached market prices for this location
     */
    setMarketPrices(prices: ItemPrice[]): void {
        this._marketPrices = prices
    }

    /**
     * Get cached market prices (returns undefined if not cached)
     */
    get marketPrices(): ItemPrice[] | undefined {
        return this._marketPrices
    }

    /**
     * Get price for a specific good (from cache)
     */
    getPrice(goodId: UInt16Type): ItemPrice | undefined {
        if (!this._marketPrices) return undefined
        return this._marketPrices.find((p) => p.id.equals(goodId))
    }

    /**
     * Find nearby planets from this location
     */
    findNearby(gameSeed: Checksum256Type, maxDistance: UInt16Type = 20): Distance[] {
        return findNearbyPlanets(Checksum256.from(gameSeed), this.coordinates, maxDistance)
    }

    /**
     * Check if this location equals another location
     */
    equals(other: CoordinatesType | Location): boolean {
        const otherCoords = other instanceof Location ? other.coordinates : Coordinates.from(other)
        return this.coordinates.equals(otherCoords)
    }

    /**
     * Set location rows (supply data) for this location
     */
    setLocationRows(rows: ServerContract.Types.supply_row[], epoch: UInt64): void {
        this._locationRows = rows
        this._epoch = epoch
    }

    /**
     * Get cached location rows (supply data)
     */
    get locationRows(): ServerContract.Types.supply_row[] | undefined {
        return this._locationRows
    }

    /**
     * Get supply for a specific good at this location
     * Returns undefined if location rows not cached or good not found
     */
    getSupply(goodId: UInt16Type): UInt16 | undefined {
        if (!this._locationRows) return undefined
        const row = this._locationRows.find(
            (r) => r.item_id.equals(goodId) && this._epoch && r.epoch.equals(this._epoch)
        )
        return row ? row.supply : undefined
    }

    /**
     * Get all available goods at this location (goods with supply > 0)
     * Returns undefined if location rows not cached
     */
    get availableGoods(): ServerContract.Types.supply_row[] | undefined {
        if (!this._locationRows) return undefined
        return this._locationRows.filter(
            (r) => this._epoch && r.epoch.equals(this._epoch) && r.supply.gt(UInt16.from(0))
        )
    }

    /**
     * Check if a specific good is available (has supply)
     * Returns false if location rows not cached
     */
    hasGood(goodId: UInt16Type): boolean {
        const supply = this.getSupply(goodId)
        return supply !== undefined && supply.gt(UInt16.from(0))
    }

    /**
     * Get the epoch for cached location data
     */
    get epoch(): UInt64 | undefined {
        return this._epoch
    }

    /**
     * Check if cached data exists
     */
    get hasCachedData(): boolean {
        return this._marketPrices !== undefined || this._locationRows !== undefined
    }

    /**
     * Check if supply data is cached
     */
    get hasSupplyData(): boolean {
        return this._locationRows !== undefined
    }

    /**
     * Clear all cached data
     */
    clearCache(): void {
        this._marketPrices = undefined
        this._locationRows = undefined
        this._epoch = undefined
    }

    /**
     * Create optimistic Location with updated supply after purchase/sale.
     * Matches contract: update_location_supply (delta can be positive or negative)
     * Contract reference: market.cpp:53, 123-151
     *
     * @param goodId - Good ID to update supply for
     * @param quantityDelta - Change in supply (negative for purchase, positive for sale)
     * @returns New Location with updated supply in cached data
     *
     * @example
     * // After buying 10 units (supply decreases)
     * const newLocation = location.withUpdatedSupply(1, -10)
     *
     * // After selling 5 units (supply increases)
     * const newLocation = location.withUpdatedSupply(1, 5)
     */
    withUpdatedSupply(goodId: UInt16Type, quantityDelta: number): Location {
        const newLocation = Location.from(this.coordinates)

        // Copy market prices if cached
        if (this._marketPrices) {
            newLocation._marketPrices = this._marketPrices.map((price) => {
                if (price.id.equals(goodId)) {
                    const currentSupply = UInt16.from(price.supply)
                    const delta = UInt16.from(Math.abs(quantityDelta))
                    const newSupply =
                        quantityDelta < 0
                            ? currentSupply.gte(delta)
                                ? currentSupply.subtracting(delta)
                                : UInt16.from(0)
                            : currentSupply.adding(quantityDelta)

                    return ItemPrice.from({
                        id: price.id,
                        item: price.item,
                        price: price.price,
                        supply: newSupply,
                    })
                }
                return price
            })
        }

        // Copy location rows if cached
        if (this._locationRows && this._epoch) {
            newLocation._locationRows = this._locationRows.map((row) => {
                if (row.item_id.equals(goodId) && row.epoch.equals(this._epoch!)) {
                    const currentSupply = UInt16.from(row.supply)
                    const delta = UInt16.from(Math.abs(quantityDelta))
                    const newSupply =
                        quantityDelta < 0
                            ? currentSupply.gte(delta)
                                ? currentSupply.subtracting(delta)
                                : UInt16.from(0)
                            : currentSupply.adding(quantityDelta)

                    return ServerContract.Types.supply_row.from({
                        id: row.id,
                        coordinates: row.coordinates,
                        epoch: row.epoch,
                        item_id: row.item_id,
                        supply: newSupply,
                    })
                }
                return row
            })
            newLocation._epoch = this._epoch
        }

        // Copy other cached data
        newLocation._gameSeed = this._gameSeed
        newLocation._hasSystem = this._hasSystem

        return newLocation
    }
}

/**
 * Helper function to convert various coordinate types to Location
 */
export function toLocation(coords: CoordinatesType | Location): Location {
    if (coords instanceof Location) {
        return coords
    }
    return Location.from(coords)
}
