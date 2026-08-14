import {getItem} from '../data/catalog'
import {categoryIndex} from './categories'
import {
    INFLUENCE_ATOMIC_PER_POINT,
    INFLUENCE_MASS_KG_MAX,
    INFLUENCE_NEED_FP_MAX,
    INFLUENCE_WEIGHT_FP_MAX,
    MASS_KG_PER_TONNE,
    NEED_FP_SCALE,
    WEIGHT_FP_SCALE,
    W_EFF_ATOMIC_PER_KG,
} from './constants'
import {findDecomp} from './decomp'
import type {DemandView} from './demand'
import {needForCategory} from './demand'
import {getStatCount, statsSumSq} from './quality'

const UINT64_MAX = (1n << 64n) - 1n

export interface InfluencePricing {
    d1: number
    weight(category: number, tier: number): bigint
}

export interface ValuedItem {
    itemId: number
    quantity: number
    stats: bigint
}

export function weightedQualityAtomic(
    weightedKgFp: bigint,
    sumSq: number,
    nStats: number,
    d1: number,
    needFp: bigint
): bigint {
    if (nStats <= 0 || d1 <= 0) throw new Error('influence: invalid quality divisor')
    const num = weightedKgFp * BigInt(sumSq) * needFp
    const den =
        (BigInt(MASS_KG_PER_TONNE) *
            BigInt(WEIGHT_FP_SCALE) *
            BigInt(nStats) *
            BigInt(d1) *
            BigInt(NEED_FP_SCALE)) /
        BigInt(INFLUENCE_ATOMIC_PER_POINT)
    return num / den
}

export function resourceValueAtomic(
    massKg: bigint,
    weightFp: bigint,
    sumSq: number,
    nStats: number,
    d1: number,
    needFp: bigint
): bigint {
    if (massKg > INFLUENCE_MASS_KG_MAX) throw new Error('influence: mass out of range')
    if (weightFp > INFLUENCE_WEIGHT_FP_MAX) throw new Error('influence: weight out of range')
    if (needFp > INFLUENCE_NEED_FP_MAX) throw new Error('influence: need out of range')
    return weightedQualityAtomic(massKg * weightFp, sumSq, nStats, d1, needFp)
}

export function componentBaseAtomic(
    weightedRawKgFp: bigint,
    sumSq: number,
    nStats: number,
    d1: number
): bigint {
    return weightedQualityAtomic(weightedRawKgFp, sumSq, nStats, d1, BigInt(NEED_FP_SCALE))
}

export function componentEffortAtomic(processedKgPerUnit: number, quantity: number): bigint {
    const processed = BigInt(processedKgPerUnit) * BigInt(quantity)
    if (processed > INFLUENCE_MASS_KG_MAX) {
        throw new Error('influence: processed mass out of range')
    }
    return processed * W_EFF_ATOMIC_PER_KG
}

export function valueCargoItem(
    item: ValuedItem,
    demand: DemandView,
    pricing: InfluencePricing
): bigint {
    const def = getItem(item.itemId)
    if (def.type !== 'resource' && def.type !== 'component') {
        throw new Error('item class cannot be valued')
    }

    const nStats = getStatCount(item.itemId)
    const sumSq = statsSumSq(item.stats, nStats)

    if (def.type === 'resource') {
        if (def.category === undefined) throw new Error('resource has no category')
        const category = categoryIndex(def.category)
        const weightFp = pricing.weight(category, def.tier)
        const needFp = needForCategory(demand, category)
        const perUnit = resourceValueAtomic(
            BigInt(def.mass),
            weightFp,
            sumSq,
            nStats,
            pricing.d1,
            needFp
        )
        const total = perUnit * BigInt(item.quantity)
        if (total > UINT64_MAX) throw new Error('influence: resource value overflow')
        return total
    }

    const entry = findDecomp(item.itemId)
    if (!entry) throw new Error('item has no decomposition')

    let weighted = 0n
    for (const bucket of entry.buckets) {
        weighted += BigInt(bucket.rawKg) * pricing.weight(bucket.category, bucket.tier)
    }

    const perUnit = componentBaseAtomic(weighted, sumSq, nStats, pricing.d1)
    const total = perUnit * BigInt(item.quantity)
    if (total > UINT64_MAX) throw new Error('influence: component value overflow')

    const withEffort = total + componentEffortAtomic(entry.processedKg, item.quantity)
    if (withEffort > UINT64_MAX) throw new Error('influence: component value overflow')
    return withEffort
}

export function valueContribution(
    bundle: ValuedItem[],
    demand: DemandView,
    pricing: InfluencePricing
): bigint {
    let total = 0n
    for (const item of bundle) total += valueCargoItem(item, demand, pricing)
    if (total > UINT64_MAX) throw new Error('influence: contribution value overflow')
    return total
}

export function pricingFromWeights(
    d1: number,
    weights: Iterable<{category: number; tier: number; weightFp: bigint | number | string}>
): InfluencePricing {
    const table = new Map<number, bigint>()
    for (const row of weights) {
        table.set(row.category * 16 + row.tier, BigInt(row.weightFp.toString()))
    }
    return {
        d1,
        weight(category: number, tier: number): bigint {
            return table.get(category * 16 + tier) ?? 0n
        },
    }
}
