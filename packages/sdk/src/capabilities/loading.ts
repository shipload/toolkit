import {UInt32, UInt64} from '@wharfkit/antelope'
import {LoaderCapability} from '../types/capabilities'

export function calcLoadDuration(entity: LoaderCapability, cargoMass: UInt64): UInt32 {
    const totalThrust = entity.loaders.thrust.toNumber() * entity.loaders.quantity.toNumber()
    if (totalThrust === 0) return UInt32.from(0)
    return UInt32.from(Math.ceil(Number(cargoMass) / totalThrust))
}
