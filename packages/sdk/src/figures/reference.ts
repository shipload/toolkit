import {UInt16, UInt32} from '@wharfkit/antelope'
import {CRAFT_ENERGY_DIVISOR, MASS_STAT_SCALE, MASS_UNITS_PER_TONNE, PRECISION} from '../types'
import {EntityClass} from '../data/kind-registry'
import {calc_gather_rate} from '../capabilities/gathering'
import {computeHaulPenalty} from '../capabilities/hauling'
import {calc_acceleration, calc_cruise_velocity, calc_onesided_duration} from '../travel/travel'

export const REFERENCE_MASS_TONNES = 10_000
export const REFERENCE_MASS = REFERENCE_MASS_TONNES * MASS_UNITS_PER_TONNE
export const REFERENCE_DEPOSIT = {stratum: 0, richness: 500} as const
export const REFERENCE_TRANSFER_TONNES = 1_000
export const REFERENCE_TRANSFER_MASS = REFERENCE_TRANSFER_TONNES * MASS_UNITS_PER_TONNE

const MILLI_PER_ENERGY = 1000
const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3600
const TONNE_GATHER_PROBE_MASS = MASS_UNITS_PER_TONNE

export function milliToEnergy(milli: number): number {
    return milli / MILLI_PER_ENERGY
}

export function cruiseSpeedLyPerHour(thrust: number, massUnits: number): number {
    if (thrust <= 0 || massUnits <= 0) return 0
    const velocity = calc_cruise_velocity(calc_acceleration(thrust, massUnits))
    return (velocity * SECONDS_PER_HOUR) / PRECISION
}

export function travelDrainPerLy(drainMilli: number): number {
    return milliToEnergy(drainMilli)
}

export function rechargePerMinute(rechargeMilliPerSecond: number): number {
    return milliToEnergy(rechargeMilliPerSecond * SECONDS_PER_MINUTE)
}

export function referenceYieldPerMinute(yieldValue: number): number {
    if (yieldValue <= 0) return 0
    return calc_gather_rate(
        {yield: UInt16.from(yieldValue), drain: UInt32.from(0), depth: UInt16.from(0)},
        TONNE_GATHER_PROBE_MASS,
        REFERENCE_DEPOSIT.stratum,
        REFERENCE_DEPOSIT.richness
    ).unitsPerMin
}

export function gatherDrainPerMinute(drain: number): number {
    return milliToEnergy((drain * SECONDS_PER_MINUTE) / PRECISION)
}

export function inputTonnesPerMinute(speed: number): number {
    return (speed * SECONDS_PER_MINUTE) / (MASS_STAT_SCALE * MASS_UNITS_PER_TONNE)
}

export function craftDrainPerKiloTonne(drain: number): number {
    return milliToEnergy((1000 * MASS_UNITS_PER_TONNE * drain) / CRAFT_ENERGY_DIVISOR)
}

export function referenceTransferSeconds(thrust: number, shuttleMass: number): number {
    return calc_onesided_duration(
        thrust,
        shuttleMass,
        0,
        0,
        EntityClass.OrbitalVessel,
        EntityClass.OrbitalVessel,
        REFERENCE_TRANSFER_MASS
    )
}

export function referenceTransferPerMinute(thrust: number, shuttleMass: number): number {
    const seconds = referenceTransferSeconds(thrust, shuttleMass)
    return seconds > 0 ? (REFERENCE_TRANSFER_TONNES * SECONDS_PER_MINUTE) / seconds : 0
}

export function handlingPercentPerContainer(efficiency: number): number {
    const probe = 1_000_000
    const kept = computeHaulPenalty(probe, 1, efficiency)
    return (Math.sqrt(probe / kept) - 1) * 100
}

const LAUNCH_CHARGE_K = 100
const LAUNCH_ENERGY_DIVISOR = 10

export function launchChargePerMinute(chargeRate: number): number {
    return (chargeRate * SECONDS_PER_MINUTE) / (LAUNCH_CHARGE_K * MASS_UNITS_PER_TONNE)
}

export function launchDrainPerKiloTonneLy(drain: number): number {
    return milliToEnergy((1000 * MASS_UNITS_PER_TONNE * drain) / LAUNCH_ENERGY_DIVISOR)
}
