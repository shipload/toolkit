import {Checksum256, type Checksum256Type} from '@wharfkit/antelope'
import {getLocationProfile} from '../derivation/resources'
import {Coordinates, type CoordinatesType} from '../types'
import {hash512} from '../utils/hash'
import {deriveLocationStatic} from '../utils/system'
import {NEED_FP_SCALE, RESOURCE_CATEGORY_COUNT} from './constants'

export const DEMAND_RANK_COUNT = 3
export const DEMAND_FALLOFF_MAX = 10
export const DEMAND_TIER_COUNT = 10
export const DEMAND_TIER_WORD = 4
export const DEMAND_TIER_ROLL_SCALE = 10_000
export const DEMAND_TIER_WEIGHTS: readonly number[] = [
    2784, 2592, 1998, 1124, 697, 250, 250, 131, 99, 75,
]

export interface DemandConfig {
    rankFp: bigint[]
    peakFp: bigint[]
    floor: bigint
}

export interface DemandView {
    abundantMask: number
    lackingMask: number
    rank: number[]
    peakTier: number[]
    needFp: bigint[][]
}

type FpLike = bigint | number | string | {toString(): string}

const ALL_CATEGORIES_MASK = 0x1f

export function demandConfigFromRow(row: {
    rank_fp: ArrayLike<FpLike>
    peak_fp: ArrayLike<FpLike>
    floor: FpLike
}): DemandConfig {
    const big = (v: FpLike) => BigInt(v.toString())
    return {
        rankFp: Array.from(row.rank_fp, big),
        peakFp: Array.from(row.peak_fp, big),
        floor: big(row.floor),
    }
}

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

export function demandWord(bytes: ArrayLike<number>, index: number): number {
    const o = index * 4
    return ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0
}

export function rankLacking(lackingMask: number, bytes: ArrayLike<number>): number[] {
    const order: number[] = []
    for (let c = 0; c < RESOURCE_CATEGORY_COUNT; c++) if (lackingMask & (1 << c)) order.push(c)
    if (order.length === 0) throw new Error('location has no lacking category')
    const n = order.length
    for (let i = n - 1; i > 0; i--) {
        const j = demandWord(bytes, n - 1 - i) % (i + 1)
        const t = order[i]
        order[i] = order[j]
        order[j] = t
    }
    return order
}

export function pickPeakTier(word: number): number {
    const roll = word % DEMAND_TIER_ROLL_SCALE
    let cum = 0
    for (let t = 0; t < DEMAND_TIER_COUNT; t++) {
        cum += DEMAND_TIER_WEIGHTS[t]
        if (roll < cum) return t + 1
    }
    return DEMAND_TIER_COUNT
}

export function cellNeed(rankFp: bigint, peakFp: bigint): bigint {
    return (rankFp * peakFp) / BigInt(NEED_FP_SCALE)
}

export function buildDemand(
    abundantMask: number,
    bytes: ArrayLike<number>,
    config: DemandConfig
): DemandView {
    if (config.rankFp.length === 0 || config.peakFp.length === 0) {
        throw new Error('influence demand config is unset')
    }
    const lackingMask = lackingMaskFrom(abundantMask)
    const order = rankLacking(lackingMask, bytes)
    if (order.length > config.rankFp.length) {
        throw new Error('location lacks more categories than demand ranks')
    }

    const rank = new Array<number>(RESOURCE_CATEGORY_COUNT).fill(0)
    const peakTier = new Array<number>(RESOURCE_CATEGORY_COUNT).fill(0)
    const needFp = Array.from({length: RESOURCE_CATEGORY_COUNT}, () =>
        new Array<bigint>(DEMAND_TIER_COUNT).fill(config.floor)
    )

    const last = config.peakFp.length - 1
    order.forEach((c, r) => {
        const peak = pickPeakTier(demandWord(bytes, DEMAND_TIER_WORD + c))
        rank[c] = r + 1
        peakTier[c] = peak
        for (let t = 1; t <= DEMAND_TIER_COUNT; t++) {
            const distance = Math.abs(t - peak)
            needFp[c][t - 1] = cellNeed(config.rankFp[r], config.peakFp[Math.min(distance, last)])
        }
    })
    return {abundantMask, lackingMask, rank, peakTier, needFp}
}

export function needForCell(demand: DemandView, category: number, tier: number): bigint {
    if (category < 0 || category >= RESOURCE_CATEGORY_COUNT) {
        throw new Error('invalid category')
    }
    if (tier < 1 || tier > DEMAND_TIER_COUNT) throw new Error('invalid tier')
    return demand.needFp[category][tier - 1]
}

// Two distinct seeds: composition from the genesis game seed, ranks and peaks from the epoch seed.
export function deriveDemand(args: {
    gameSeed: Checksum256Type
    epochSeed: Checksum256Type
    coordinates: CoordinatesType
    config: DemandConfig
}): DemandView {
    const coords = Coordinates.from(args.coordinates)
    const location = deriveLocationStatic(args.gameSeed, coords)
    const abundant = abundantMaskFor(Number(location.type), Number(location.subtype))
    if (abundant === 0) throw new Error('location has no composition')

    const hash = hash512(
        Checksum256.from(args.epochSeed),
        `demand-${coords.x.toString()}-${coords.y.toString()}`
    )
    return buildDemand(abundant, hash.array, args.config)
}

export function isAbundant(demand: DemandView, category: number): boolean {
    return (demand.abundantMask & (1 << category)) !== 0
}

export function rankedCategories(demand: DemandView): number[] {
    const ranked: number[] = []
    for (let c = 0; c < RESOURCE_CATEGORY_COUNT; c++) if (demand.rank[c] > 0) ranked.push(c)
    return ranked.sort((a, b) => demand.rank[a] - demand.rank[b])
}

export function needMultiplier(demand: DemandView, category: number, tier: number): number {
    return Number(needForCell(demand, category, tier)) / NEED_FP_SCALE
}
