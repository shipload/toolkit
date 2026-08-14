import {Checksum256, type Checksum256Type} from '@wharfkit/antelope'
import {Coordinates, type CoordinatesType, LocationType} from '../types'
import {hash512} from '../utils/hash'
import {deriveLocationStatic, getSystemName} from '../utils/system'

const CITIZENRY_PATTERNS: ((world: string) => string)[] = [
    (w) => `${w} Collective`,
    (w) => `${w} Compact`,
    (w) => `Concord of ${w}`,
    (w) => `${w} Union`,
]

export function citizenryName(
    gameSeed: Checksum256Type,
    coordinates: CoordinatesType
): string | undefined {
    const coords = Coordinates.from(coordinates)
    const location = deriveLocationStatic(gameSeed, coords)
    if (Number(location.type) !== LocationType.PLANET) return undefined

    const world = getSystemName(gameSeed, coords)
    const roll = hash512(
        Checksum256.from(gameSeed),
        `citizenry-${coords.x.toString()}-${coords.y.toString()}`
    ).array[0]
    return CITIZENRY_PATTERNS[roll % CITIZENRY_PATTERNS.length](world)
}

export function citizenryPatternCount(): number {
    return CITIZENRY_PATTERNS.length
}
