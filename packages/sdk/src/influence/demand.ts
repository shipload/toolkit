import {Checksum256, type Checksum256Type, type Checksum512} from '@wharfkit/antelope'
import {getLocationProfile} from '../derivation/resources'
import {Coordinates, type CoordinatesType} from '../types'
import {hash512} from '../utils/hash'
import {deriveLocationStatic} from '../utils/system'
import {RESOURCE_CATEGORY_COUNT} from './constants'

export interface DemandTriple {
    peak: bigint
    base: bigint
    floor: bigint
}

export interface DemandView {
    abundantMask: number
    lackingMask: number
    acute: number
    needFp: bigint[]
}

const ALL_CATEGORIES_MASK = 0x1f

export function abundantMaskFor(locationType: number, subtype: number): number {
    let mask = 0
    for (const entry of getLocationProfile(locationType, subtype)) {
        mask |= 1 << entry.category
    }
    return mask
}

export function lackingMaskFrom(abundantMask: number): number {
    return ~abundantMask & ALL_CATEGORIES_MASK
}

export function popcount5(mask: number): number {
    let n = 0
    for (let i = 0; i < RESOURCE_CATEGORY_COUNT; i++) if (mask & (1 << i)) n++
    return n
}

export function pickAcuteCategory(lackingMask: number, roll: number): number {
    const count = popcount5(lackingMask)
    if (count === 0) throw new Error('location has no lacking category')
    let index = roll % count
    for (let c = 0; c < RESOURCE_CATEGORY_COUNT; c++) {
        if ((lackingMask & (1 << c)) === 0) continue
        if (index === 0) return c
        index--
    }
    throw new Error('acute pick fell through')
}

export function demandRoll(hash: Checksum512): number {
    const bytes = hash.array
    return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
}

export function buildDemand(abundantMask: number, acute: number, triple: DemandTriple): DemandView {
    const lackingMask = lackingMaskFrom(abundantMask)
    const needFp: bigint[] = []
    for (let c = 0; c < RESOURCE_CATEGORY_COUNT; c++) {
        if (c === acute) needFp.push(triple.peak)
        else if (lackingMask & (1 << c)) needFp.push(triple.base)
        else needFp.push(triple.floor)
    }
    return {abundantMask, lackingMask, acute, needFp}
}

export function needForCategory(demand: DemandView, category: number): bigint {
    if (category < 0 || category >= RESOURCE_CATEGORY_COUNT) {
        throw new Error('invalid category')
    }
    return demand.needFp[category]
}

// Two distinct seeds: composition from the genesis game seed, acute rotation from the epoch seed.
export function deriveDemand(args: {
    gameSeed: Checksum256Type
    epochSeed: Checksum256Type
    coordinates: CoordinatesType
    triple: DemandTriple
}): DemandView {
    const coords = Coordinates.from(args.coordinates)
    const location = deriveLocationStatic(args.gameSeed, coords)
    const abundant = abundantMaskFor(Number(location.type), Number(location.subtype))
    if (abundant === 0) throw new Error('location has no composition')

    const hash = hash512(
        Checksum256.from(args.epochSeed),
        `demand-${coords.x.toString()}-${coords.y.toString()}`
    )
    const acute = pickAcuteCategory(lackingMaskFrom(abundant), demandRoll(hash))
    return buildDemand(abundant, acute, args.triple)
}

export function isAbundant(demand: DemandView, category: number): boolean {
    return (demand.abundantMask & (1 << category)) !== 0
}

export function isAcute(demand: DemandView, category: number): boolean {
    return demand.acute === category
}

export function needMultiplier(demand: DemandView, category: number): number {
    return Number(needForCategory(demand, category)) / 10_000
}
