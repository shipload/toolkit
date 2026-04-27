import {UInt32, UInt64} from '@wharfkit/antelope'
import {EnergyCapability, MovementCapability} from '../types/capabilities'
import {PRECISION} from '../types'

export function maxTravelDistance(entity: MovementCapability): UInt32 {
    return UInt32.from(entity.generator.capacity)
        .dividing(entity.engines.drain)
        .multiplying(PRECISION)
}

export function calcEnergyUsage(entity: MovementCapability, distance: UInt64): UInt64 {
    return distance.dividing(PRECISION).multiplying(entity.engines.drain)
}

export function hasEnergyForDistance(
    entity: MovementCapability & EnergyCapability,
    distance: UInt64
): boolean {
    const usage = calcEnergyUsage(entity, distance)
    return UInt64.from(entity.energy).gte(usage)
}

export function energyPercent(entity: MovementCapability & EnergyCapability): number {
    return (Number(entity.energy) / Number(entity.generator.capacity)) * 100
}

export function needsRecharge(entity: MovementCapability & EnergyCapability): boolean {
    return UInt64.from(entity.energy).lt(entity.generator.capacity)
}
