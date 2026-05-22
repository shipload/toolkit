import {UInt16, UInt32} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import {PRECISION} from '../types'

const GATHER_TIME_SCALE = 100
const GATHER_MASS_DIVISOR = 228
const DEPTH_PENALTY_DIVISOR = 5000

export function calc_gather_duration(
    gatherer: ServerContract.Types.gatherer_stats,
    itemMass: number,
    quantity: number,
    stratum: number,
    richness: number
): UInt32 {
    const yieldValue = gatherer.yield.toNumber()

    if (yieldValue === 0 || richness === 0) return UInt32.from(0)

    const massFactor = itemMass / GATHER_MASS_DIVISOR
    const depthPenalty = 1 + stratum / DEPTH_PENALTY_DIVISOR
    const richnessMul = richness / 1000
    const duration =
        (quantity * massFactor * GATHER_TIME_SCALE * depthPenalty) / (yieldValue * richnessMul)
    return UInt32.from(Math.floor(duration))
}

export function calc_gather_rate(
    gatherer: ServerContract.Types.gatherer_stats,
    itemMass: number,
    stratum: number,
    richness: number
): {unitsPerSec: number; unitsPerMin: number; secPerUnit: number} {
    const seconds = calc_gather_duration(gatherer, itemMass, 1, stratum, richness).toNumber()
    if (seconds <= 0) return {unitsPerSec: 0, unitsPerMin: 0, secPerUnit: 0}
    const unitsPerSec = 1 / seconds
    return {unitsPerSec, unitsPerMin: unitsPerSec * 60, secPerUnit: seconds}
}

export function calc_gather_energy(
    gatherer: ServerContract.Types.gatherer_stats,
    duration: number
): UInt16 {
    const energy = Math.floor((duration * gatherer.drain.toNumber()) / PRECISION)
    return UInt16.from(energy)
}
