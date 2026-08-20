import {Checksum256, type Checksum256Type} from '@wharfkit/antelope'
import {Coordinates, type CoordinatesType, LocationType} from '../types'
import {hash512, uint16} from '../utils/hash'
import {deriveLocationStatic, getSystemName} from '../utils/system'
import citizenryAdjectives from '../data/citizenry-adjectives.json'
import citizenryNouns from '../data/citizenry-nouns.json'

const CITIZENRY_FORMS: ((world: string, noun: string, adjective: string) => string)[] = [
    (w, n) => `${w} ${n}`,
    (w, n, a) => `${a} ${w} ${n}`,
    (w, n, a) => `${a} ${n} of ${w}`,
]

const FORMS_WITH_ADJECTIVE = 2

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
    )
    const form = CITIZENRY_FORMS[roll.array[0] % CITIZENRY_FORMS.length]
    const noun = citizenryNouns[uint16(roll, 1) % citizenryNouns.length]
    const adjective = citizenryAdjectives[uint16(roll, 3) % citizenryAdjectives.length]
    return form(world, noun, adjective)
}

export function citizenryPatternCount(): number {
    const plainForms = CITIZENRY_FORMS.length - FORMS_WITH_ADJECTIVE
    return citizenryNouns.length * (plainForms + FORMS_WITH_ADJECTIVE * citizenryAdjectives.length)
}
