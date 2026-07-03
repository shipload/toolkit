import {UInt32} from '@wharfkit/antelope'
import type {GathererStats} from '../types/capabilities'
import {PRECISION} from '../types'

const GATHER_TIME_SCALE = 100
export const GATHER_MASS_DIVISOR = 228
const DEPTH_PENALTY_DIVISOR = 5000

function gather_duration_raw(
    gatherer: GathererStats,
    itemMass: number,
    quantity: number,
    stratum: number,
    richness: number
): number {
    const yieldValue = gatherer.yield.toNumber()

    if (yieldValue === 0 || richness === 0) return 0

    const massFactor = itemMass / GATHER_MASS_DIVISOR
    const depthPenalty = 1 + stratum / DEPTH_PENALTY_DIVISOR
    const richnessMul = richness / 1000
    return (quantity * massFactor * GATHER_TIME_SCALE * depthPenalty) / (yieldValue * richnessMul)
}

export function calc_gather_duration(
    gatherer: GathererStats,
    itemMass: number,
    quantity: number,
    stratum: number,
    richness: number
): UInt32 {
    const raw = gather_duration_raw(gatherer, itemMass, quantity, stratum, richness)
    // +1 per-gather setup cost mirrors the contract: splitting a bulk gather must not undercut lane-time
    return UInt32.from(raw <= 0 ? 0 : Math.floor(raw) + 1)
}

export function calc_gather_rate(
    gatherer: GathererStats,
    itemMass: number,
    stratum: number,
    richness: number
): {unitsPerSec: number; unitsPerMin: number; secPerUnit: number} {
    const secPerUnit = gather_duration_raw(gatherer, itemMass, 1, stratum, richness)
    if (secPerUnit <= 0) return {unitsPerSec: 0, unitsPerMin: 0, secPerUnit: 0}
    const unitsPerSec = 1 / secPerUnit
    return {unitsPerSec, unitsPerMin: unitsPerSec * 60, secPerUnit}
}

export function calc_gather_energy(gatherer: GathererStats, duration: number): UInt32 {
    if (duration <= 0) return UInt32.from(0)
    const raw = Math.floor((duration * gatherer.drain.toNumber()) / PRECISION)
    return UInt32.from(Math.min(Math.max(raw, 1), 4294967295))
}
