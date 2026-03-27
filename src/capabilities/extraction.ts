import {UInt16, UInt32} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {PRECISION} from '../types'

function calc_load_time_internal(
    loaders: ServerContract.Types.loader_stats,
    shipZ: number,
    cargoMass: number
): number {
    if (cargoMass === 0 || loaders.quantity.toNumber() === 0 || loaders.thrust.toNumber() === 0) {
        return 0
    }

    const totalMass = cargoMass + loaders.mass.toNumber()
    const acceleration = (loaders.thrust.toNumber() / totalMass) * PRECISION
    const flightTime = Math.floor(2 * Math.sqrt(shipZ / acceleration))
    return Math.floor(flightTime / loaders.quantity.toNumber())
}

export function calc_extraction_duration(
    extractor: ServerContract.Types.extractor_stats,
    loaders: ServerContract.Types.loader_stats,
    shipZ: number,
    batchMass: number
): UInt32 {
    const extractionTime = Math.floor(batchMass / extractor.rate.toNumber())
    const loadingTime = calc_load_time_internal(loaders, shipZ, batchMass)
    return UInt32.from(Math.max(extractionTime, loadingTime))
}

export function calc_extraction_energy(
    extractor: ServerContract.Types.extractor_stats,
    duration: number
): UInt16 {
    const energy = Math.floor((duration * extractor.drain.toNumber()) / PRECISION)
    return UInt16.from(energy)
}
