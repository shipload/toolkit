import {UInt16, UInt32} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {PRECISION} from '../types'

const EXTRACTION_TIME_SCALE = 100
const DEPTH_PENALTY_DIVISOR = 5000
const DRILL_TIME_SCALE = 300

export function calc_extraction_duration(
    extractor: ServerContract.Types.extractor_stats,
    itemMass: number,
    quantity: number,
    stratum: number,
    richness: number
): UInt32 {
    const rate = extractor.rate.toNumber()
    const drill = extractor.drill.toNumber()

    if (rate === 0 || drill === 0 || richness === 0) return UInt32.from(0)

    const massFactor = Math.sqrt(itemMass)
    const depthPenalty = 1 + stratum / DEPTH_PENALTY_DIVISOR
    const richnessMul = richness / 1000
    const extractionTime = quantity * massFactor * EXTRACTION_TIME_SCALE * depthPenalty
                         / (rate * richnessMul)
    const drillTime = DRILL_TIME_SCALE * Math.log(1 + stratum / drill)
    return UInt32.from(Math.floor(extractionTime + drillTime))
}

export function calc_extraction_energy(
    extractor: ServerContract.Types.extractor_stats,
    duration: number
): UInt16 {
    const energy = Math.floor((duration * extractor.drain.toNumber()) / PRECISION)
    return UInt16.from(energy)
}
