import {getItem} from '../data/catalog'
import {MASS_UNITS_PER_TONNE} from '../types'
import {categoryIndex} from './categories'
import {
    INFLUENCE_ATOMIC_PER_POINT,
    INFLUENCE_MASS_MAX,
    INFLUENCE_NEED_FP_MAX,
    INFLUENCE_WEIGHT_FP_MAX,
    NEED_FP_SCALE,
    WEIGHT_FP_SCALE,
    W_EFF_ATOMIC_PER_UNIT,
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
    weightedMassFp: bigint,
    sumSq: number,
    nStats: number,
    d1: number,
    needFp: bigint
): bigint {
    if (nStats <= 0 || d1 <= 0) throw new Error('influence: invalid quality divisor')
    const num = weightedMassFp * BigInt(sumSq) * needFp
    const den =
        (BigInt(MASS_UNITS_PER_TONNE) *
            BigInt(WEIGHT_FP_SCALE) *
            BigInt(nStats) *
            BigInt(d1) *
            BigInt(NEED_FP_SCALE)) /
        BigInt(INFLUENCE_ATOMIC_PER_POINT)
    return num / den
}

export function resourceValueAtomic(
    mass: bigint,
    weightFp: bigint,
    sumSq: number,
    nStats: number,
    d1: number,
    needFp: bigint
): bigint {
    if (mass > INFLUENCE_MASS_MAX) throw new Error('influence: mass out of range')
    if (weightFp > INFLUENCE_WEIGHT_FP_MAX) throw new Error('influence: weight out of range')
    if (needFp > INFLUENCE_NEED_FP_MAX) throw new Error('influence: need out of range')
    return weightedQualityAtomic(mass * weightFp, sumSq, nStats, d1, needFp)
}

export function componentBaseAtomic(
    weightedRawMassFp: bigint,
    sumSq: number,
    nStats: number,
    d1: number
): bigint {
    return weightedQualityAtomic(weightedRawMassFp, sumSq, nStats, d1, BigInt(NEED_FP_SCALE))
}

export function componentEffortAtomic(processedMassPerUnit: number, quantity: number): bigint {
    const processed = BigInt(processedMassPerUnit) * BigInt(quantity)
    if (processed > INFLUENCE_MASS_MAX) {
        throw new Error('influence: processed mass out of range')
    }
    return processed * W_EFF_ATOMIC_PER_UNIT
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
        weighted += BigInt(bucket.rawMass) * pricing.weight(bucket.category, bucket.tier)
    }

    const perUnit = componentBaseAtomic(weighted, sumSq, nStats, pricing.d1)
    const total = perUnit * BigInt(item.quantity)
    if (total > UINT64_MAX) throw new Error('influence: component value overflow')

    const withEffort = total + componentEffortAtomic(entry.processedMass, item.quantity)
    if (withEffort > UINT64_MAX) throw new Error('influence: component value overflow')
    return withEffort
}

export interface ResourceValuation {
    kind: 'resource'
    category: number
    tier: number
    mass: bigint
    weight: number
    quality: number
    need: number
    totalAtomic: bigint
    points: number
}

export interface ComponentValuation {
    kind: 'component'
    rawMass: number
    processedMass: number
    weight: number
    quality: number
    baseAtomic: bigint
    effortAtomic: bigint
    totalAtomic: bigint
    points: number
}

export type CargoValuation = ResourceValuation | ComponentValuation

export function explainCargoItem(
    item: ValuedItem,
    demand: DemandView,
    pricing: InfluencePricing
): CargoValuation {
    const def = getItem(item.itemId)
    const totalAtomic = valueCargoItem(item, demand, pricing)
    const points = Number(totalAtomic) / INFLUENCE_ATOMIC_PER_POINT
    const nStats = getStatCount(item.itemId)
    const quality = statsSumSq(item.stats, nStats) / (nStats * pricing.d1)

    if (def.type === 'resource') {
        if (def.category === undefined) throw new Error('resource has no category')
        const category = categoryIndex(def.category)
        return {
            kind: 'resource',
            category,
            tier: def.tier,
            mass: BigInt(def.mass) * BigInt(item.quantity),
            weight: Number(pricing.weight(category, def.tier)) / WEIGHT_FP_SCALE,
            quality,
            need: Number(needForCategory(demand, category)) / NEED_FP_SCALE,
            totalAtomic,
            points,
        }
    }

    const entry = findDecomp(item.itemId)
    if (!entry) throw new Error('item has no decomposition')
    let rawMass = 0
    let weighted = 0n
    for (const bucket of entry.buckets) {
        rawMass += bucket.rawMass
        weighted += BigInt(bucket.rawMass) * pricing.weight(bucket.category, bucket.tier)
    }
    const effortAtomic = componentEffortAtomic(entry.processedMass, item.quantity)
    return {
        kind: 'component',
        rawMass: rawMass * item.quantity,
        processedMass: entry.processedMass * item.quantity,
        weight: rawMass === 0 ? 0 : Number(weighted) / (rawMass * WEIGHT_FP_SCALE),
        quality,
        baseAtomic: totalAtomic - effortAtomic,
        effortAtomic,
        totalAtomic,
        points,
    }
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
