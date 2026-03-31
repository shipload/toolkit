import {Checksum256, Checksum256Type, Checksum512, UInt8} from '@wharfkit/antelope'
import {hash512} from './hash'
import {Coordinates, CoordinatesType, LocationType} from '../types'
import {ServerContract} from '../contracts'
import {deriveLocationSize} from '../derivation/location-size'
import syllables from '../data/syllables.json'
import nebulaAdjectives from '../data/nebula-adjectives.json'
import nebulaNouns from '../data/nebula-nouns.json'

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

function uint16(hash: Checksum512, offset: number): number {
    return (hash.array[offset] << 8) | hash.array[offset + 1]
}

function generatePlanetName(hashResult: Checksum512): string {
    const syllableCount = 2 + (hashResult.array[0] % 2)
    const name: string[] = []
    for (let i = 0; i < syllableCount; i++) {
        const index = uint16(hashResult, 1 + i * 2) % syllables.length
        const syllable = syllables[index]
        name.push(i > 0 ? syllable.toLowerCase() : syllable)
    }
    return name.join('')
}

function generateAsteroidName(hashResult: Checksum512): string {
    const A = 65
    const letter1 = String.fromCharCode(A + (hashResult.array[0] % 26))
    const letter2 = String.fromCharCode(A + (hashResult.array[1] % 26))
    const num = (uint16(hashResult, 2) % 9000) + 1000
    return `${letter1}${letter2}-${num}`
}

function generateNebulaName(hashResult: Checksum512): string {
    const adjIdx = uint16(hashResult, 0) % nebulaAdjectives.length
    const nounIdx = uint16(hashResult, 2) % nebulaNouns.length
    return `${nebulaAdjectives[adjIdx]} ${nebulaNouns[nounIdx]}`
}

export function getSystemName(gameSeed: Checksum256Type, location: CoordinatesType): string {
    const seed = Checksum256.from(gameSeed)
    const locationType = getLocationType(seed, location)
    if (locationType === LocationType.EMPTY) {
        throw new Error("System doesn't exist at location")
    }
    const seedStr = `${location.x}-${location.y}-${locationType}-name`
    const hashResult = hash512(seed, seedStr)
    switch (locationType) {
        case LocationType.PLANET:
            return generatePlanetName(hashResult)
        case LocationType.ASTEROID:
            return generateAsteroidName(hashResult)
        case LocationType.NEBULA:
            return generateNebulaName(hashResult)
        default:
            return generatePlanetName(hashResult)
    }
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
        Number(loc.type) === LocationType.PLANET ? hashResult.array[2] % 6 : hashResult.array[2]
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
    const staticProps = deriveLocationStatic(gameSeed, coordinates)
    return ServerContract.Types.location_derived.from({
        static_props: staticProps,
        epoch_props: deriveLocationEpoch(epochSeed, coordinates),
        size: deriveLocationSize(staticProps),
    })
}
