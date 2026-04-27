import {UInt16, UInt32} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import {PRECISION} from '../types'

const GATHER_TIME_SCALE = 100
const DEPTH_PENALTY_DIVISOR = 5000
const SPEED_TIME_SCALE = 300

export function calc_gather_duration(
    gatherer: ServerContract.Types.gatherer_stats,
    itemMass: number,
    quantity: number,
    stratum: number,
    richness: number
): UInt32 {
    const yieldValue = gatherer.yield.toNumber()
    const speed = gatherer.speed.toNumber()

    if (yieldValue === 0 || speed === 0 || richness === 0) return UInt32.from(0)

    const massFactor = Math.sqrt(itemMass)
    const depthPenalty = 1 + stratum / DEPTH_PENALTY_DIVISOR
    const richnessMul = richness / 1000
    const gatherTime =
        (quantity * massFactor * GATHER_TIME_SCALE * depthPenalty) / (yieldValue * richnessMul)
    const speedTime = SPEED_TIME_SCALE * Math.log(1 + stratum / speed)
    return UInt32.from(Math.floor(gatherTime + speedTime))
}

export function calc_gather_energy(
    gatherer: ServerContract.Types.gatherer_stats,
    duration: number
): UInt16 {
    const energy = Math.floor((duration * gatherer.drain.toNumber()) / PRECISION)
    return UInt16.from(energy)
}
