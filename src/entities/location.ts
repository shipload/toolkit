import {Checksum256, Checksum256Type, UInt16Type, UInt64} from '@wharfkit/antelope'
import {Coordinates, CoordinatesType, Distance, LocationType} from '../types'
import {getLocationType, hasSystem, isExtractableLocation} from '../utils/system'
import {findNearbyPlanets} from '../travel/travel'

export class Location {
    readonly coordinates: Coordinates
    private _gameSeed?: Checksum256
    private _hasSystem?: boolean
    private _epoch?: UInt64

    constructor(coordinates: CoordinatesType) {
        this.coordinates = Coordinates.from(coordinates)
    }

    static from(coordinates: CoordinatesType): Location {
        return new Location(Coordinates.from(coordinates))
    }

    hasSystemAt(gameSeed: Checksum256Type): boolean {
        const seed = Checksum256.from(gameSeed)
        if (this._hasSystem === undefined || !this._gameSeed?.equals(seed)) {
            this._gameSeed = seed
            this._hasSystem = hasSystem(seed, this.coordinates)
        }
        return this._hasSystem
    }

    getLocationTypeAt(gameSeed: Checksum256Type): LocationType {
        return getLocationType(gameSeed, this.coordinates)
    }

    isExtractableAt(gameSeed: Checksum256Type): boolean {
        return isExtractableLocation(this.getLocationTypeAt(gameSeed))
    }

    findNearby(gameSeed: Checksum256Type, maxDistance: UInt16Type = 20): Distance[] {
        return findNearbyPlanets(Checksum256.from(gameSeed), this.coordinates, maxDistance)
    }

    equals(other: CoordinatesType | Location): boolean {
        const otherCoords = other instanceof Location ? other.coordinates : Coordinates.from(other)
        return this.coordinates.equals(otherCoords)
    }

    get epoch(): UInt64 | undefined {
        return this._epoch
    }

    clearCache(): void {
        this._epoch = undefined
    }
}

export function toLocation(coords: CoordinatesType | Location): Location {
    if (coords instanceof Location) {
        return coords
    }
    return Location.from(coords)
}
