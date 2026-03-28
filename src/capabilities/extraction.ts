import {UInt16, UInt32} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {PRECISION} from '../types'

export function calc_extraction_duration(
    extractor: ServerContract.Types.extractor_stats,
    cargoMass: number,
    stratum: number,
    richness: number
): UInt32 {
    const rate = extractor.rate.toNumber()
    const efficiency = extractor.efficiency.toNumber()
    const drill = extractor.drill.toNumber()

    const rateProduct = Math.floor((rate * richness * efficiency) / PRECISION)
    if (rateProduct === 0) return UInt32.from(0)

    const extractionTime = Math.floor((cargoMass * PRECISION) / rateProduct)
    const drillTime = Math.floor(stratum / drill)

    return UInt32.from(extractionTime + drillTime)
}

export function calc_extraction_energy(
    extractor: ServerContract.Types.extractor_stats,
    duration: number
): UInt16 {
    const energy = Math.floor((duration * extractor.drain.toNumber()) / PRECISION)
    return UInt16.from(energy)
}
