import {Checksum256, Checksum256Type, UInt8} from '@wharfkit/antelope'
import {hash512} from './hash'
import {Coordinates, CoordinatesType, LocationType} from '../types'
import {ServerContract} from '../contracts'
import syllables from '../data/syllables.json'

const LOCATION_EXISTS_THRESHOLD = 0x10
const LOCATION_ACTIVE_THRESHOLD = 0x80

export function getLocationType(
    gameSeed: Checksum256Type,
    coordinates: CoordinatesType
): LocationType {
    const seed = Checksum256.from(gameSeed)
    const str = ['system', coordinates.x, coordinates.y].join('-')
    const hashResult = hash512(seed, str)

    if (hashResult.array[0] >= LOCATION_EXISTS_THRESHOLD) {
        return LocationType.EMPTY
    }

    if (hashResult.array[1] < 96) {
        return LocationType.PLANET
    } else if (hashResult.array[1] < 176) {
        return LocationType.ASTEROID
    }
    return LocationType.NEBULA
}

export function isExtractableLocation(locationType: LocationType): boolean {
    return locationType !== LocationType.EMPTY
}

export function getSystemName(gameSeed: Checksum256Type, location: CoordinatesType): string {
    const seed = Checksum256.from(gameSeed)
    if (!hasSystem(seed, location)) {
        throw new Error("System doesn't exist at location")
    }
    const seedStr = `${location.x}${location.y}systemName`
    const hashResult = hash512(seed, seedStr)
    const syllableCount = 1 + (hashResult.array[0] % 3)
    const name: string[] = []
    for (let i = 0; i < syllableCount; i++) {
        const index = hashResult.array[i] % syllables.length
        const syllable = syllables[index]
        name.push(i > 0 ? syllable.toLowerCase() : syllable)
    }
    return name.join('')
}

export function hasSystem(gameSeed: Checksum256Type, coordinates: CoordinatesType): boolean {
    return getLocationType(gameSeed, coordinates) !== LocationType.EMPTY
}

export function deriveLocationStatic(
    gameSeed: Checksum256Type,
    coordinates: CoordinatesType
): ServerContract.Types.location_static {
    const seed = Checksum256.from(gameSeed)
    const coords = Coordinates.from(coordinates)
    const str = `system-${coords.x}-${coords.y}`
    const hashResult = hash512(seed, str)

    const loc = ServerContract.Types.location_static.from({
        coords: coords,
        type: LocationType.EMPTY,
        subtype: 0,
        seed0: 0,
        seed1: 0,
    })

    if (hashResult.array[0] >= LOCATION_EXISTS_THRESHOLD) {
        return loc
    }

    if (hashResult.array[1] < 96) {
        loc.type = UInt8.from(LocationType.PLANET)
    } else if (hashResult.array[1] < 176) {
        loc.type = UInt8.from(LocationType.ASTEROID)
    } else {
        loc.type = UInt8.from(LocationType.NEBULA)
    }

    loc.subtype = UInt8.from(
        Number(loc.type) === LocationType.PLANET
            ? hashResult.array[2] % 6
            : hashResult.array[2]
    )
    loc.seed0 = UInt8.from(hashResult.array[3])
    loc.seed1 = UInt8.from(hashResult.array[4])

    return loc
}

export function deriveLocationEpoch(
    epochSeed: Checksum256Type,
    coordinates: CoordinatesType
): ServerContract.Types.location_epoch {
    const seed = Checksum256.from(epochSeed)
    const coords = Coordinates.from(coordinates)
    const str = `system-epoch-${coords.x}-${coords.y}`
    const hashResult = hash512(seed, str)

    return ServerContract.Types.location_epoch.from({
        active: hashResult.array[0] < LOCATION_ACTIVE_THRESHOLD,
        seed0: hashResult.array[1],
        seed1: hashResult.array[2],
    })
}

export function deriveLocation(
    gameSeed: Checksum256Type,
    epochSeed: Checksum256Type,
    coordinates: CoordinatesType
): ServerContract.Types.location_derived {
    return ServerContract.Types.location_derived.from({
        static_props: deriveLocationStatic(gameSeed, coordinates),
        epoch_props: deriveLocationEpoch(epochSeed, coordinates),
    })
}
