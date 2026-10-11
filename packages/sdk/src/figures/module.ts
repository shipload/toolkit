import type {UInt64Type} from '@wharfkit/antelope'
import {computeModuleCapabilities, type ModuleCapabilities} from '../derivation/capabilities'
import {computeTravelDrain} from '../nft/description'
import {
    craftDrainPerKiloTonne,
    cruiseSpeedLyPerHour,
    gatherDrainPerMinute,
    handlingPercentPerContainer,
    inputTonnesPerMinute,
    launchChargePerMinute,
    launchDrainPerKiloTonneLy,
    milliToEnergy,
    rechargePerMinute,
    REFERENCE_MASS,
    referenceTransferPerMinute,
    referenceYieldPerMinute,
    travelDrainPerLy,
} from './reference'
import {
    formatDistance,
    formatFigureTonnes,
    formatFixed,
    formatPerDistance,
    formatTonnesRate,
    signed,
} from './format'
import {
    FIGURE_SECTION_LABELS,
    MODULE_FIGURE_SECTION,
    type Figure,
    type ModuleFigures,
} from './types'
import {MASS_UNITS_PER_TONNE} from '../types'

export const WARP_JUMP_NOTE = 'Spends a full charge; the hold must be empty.'

export function speedFigure(key: string, label: string, lyPerHour: number): Figure {
    return {key, label, value: lyPerHour, unit: 'ly/hr', text: `${formatFixed(lyPerHour)} ly/hr`}
}

export function travelDrainFigure(key: string, label: string, drainMilli: number): Figure {
    const value = travelDrainPerLy(drainMilli)
    return {key, label, value, unit: 'energy/ly', text: formatPerDistance(value)}
}

export function energyFigure(key: string, label: string, milli: number, plus = false): Figure {
    const value = milliToEnergy(milli)
    const text = `${formatFixed(value)} energy`
    return {key, label, value, unit: 'energy', text: plus ? signed(text) : text}
}

export function rechargeFigure(
    key: string,
    label: string,
    milliPerSecond: number,
    plus = false
): Figure {
    const value = rechargePerMinute(milliPerSecond)
    const text = `${formatFixed(value)} energy/min`
    return {key, label, value, unit: 'energy/min', text: plus ? signed(text) : text}
}

export function tonnesFigure(key: string, label: string, massUnits: number, plus = false): Figure {
    const text = formatFigureTonnes(massUnits)
    return {
        key,
        label,
        value: massUnits / MASS_UNITS_PER_TONNE,
        unit: 't',
        text: plus ? signed(text) : text,
    }
}

export function distanceFigure(key: string, label: string, ly: number): Figure {
    return {key, label, value: ly, unit: 'ly', text: formatDistance(ly)}
}

export function yieldFigure(key: string, label: string, yieldValue: number): Figure {
    const value = referenceYieldPerMinute(yieldValue)
    return {key, label, value, unit: 't/min', text: formatTonnesRate(value, 1)}
}

export function depthFigure(key: string, label: string, depth: number): Figure {
    return {key, label, value: depth, unit: 'km', text: `${formatFixed(depth)} km`}
}

export function gatherDrainFigure(key: string, label: string, drain: number): Figure {
    const value = gatherDrainPerMinute(drain)
    return {key, label, value, unit: 'energy/min', text: `${formatFixed(value, 1)} energy/min`}
}

export function inputSpeedFigure(key: string, label: string, speed: number): Figure {
    const value = inputTonnesPerMinute(speed)
    return {key, label, value, unit: 't/min', text: formatTonnesRate(value, 1)}
}

export function craftDrainFigure(key: string, label: string, drain: number): Figure {
    const value = craftDrainPerKiloTonne(drain)
    return {key, label, value, unit: 'energy/k t', text: `${formatFixed(value)} energy/k t`}
}

export function transferFigure(
    key: string,
    label: string,
    thrust: number,
    shuttleMass: number
): Figure {
    const value = referenceTransferPerMinute(thrust, shuttleMass)
    return {
        key,
        label,
        value,
        unit: 't/min',
        text: formatTonnesRate(value, 0),
        provisional: true,
    }
}

export function countFigure(key: string, label: string, count: number): Figure {
    return {key, label, value: count, unit: '', text: formatFixed(count)}
}

export function towsText(byTier: {tier: number; capacity: number}[]): string {
    return byTier
        .map(
            ({tier, capacity}) =>
                `${formatFixed(capacity)} ${capacity === 1 ? 'container' : 'containers'}, T${tier} and below`
        )
        .join('; ')
}

export function towsFigure(
    key: string,
    label: string,
    byTier: {tier: number; capacity: number}[]
): Figure {
    const value = byTier.reduce((sum, entry) => sum + entry.capacity, 0)
    return {key, label, value, unit: 'containers', text: towsText(byTier)}
}

export function handlingFigure(key: string, label: string, efficiency: number): Figure {
    const value = handlingPercentPerContainer(efficiency)
    return {
        key,
        label,
        value,
        unit: '%',
        text: `+${formatFixed(value)}% travel time per towed container, plus its weight`,
    }
}

export function jumpFigure(key: string, label: string, range: number): Figure {
    return {...distanceFigure(key, label, range), note: WARP_JUMP_NOTE}
}

function moduleRows(caps: ModuleCapabilities): Figure[] {
    switch (caps.kind) {
        case 'engine':
            return [
                speedFigure('speed', 'Speed', cruiseSpeedLyPerHour(caps.thrust, REFERENCE_MASS)),
                travelDrainFigure('drain', 'Drain', computeTravelDrain(caps.thrust, caps.thermal)),
            ]
        case 'generator':
            return [
                energyFigure('capacity', 'Capacity', caps.capacity, true),
                rechargeFigure('recharge', 'Recharge', caps.recharge, true),
            ]
        case 'battery':
            return [energyFigure('capacity', 'Capacity', caps.capacity, true)]
        case 'storage':
            return [
                tonnesFigure('capacity', 'Capacity', caps.capacity, true),
                travelDrainFigure('drain', 'Drain', caps.drain),
            ]
        case 'hauler':
            return [
                towsFigure('tows', 'Tows', [{tier: caps.tier, capacity: caps.capacity}]),
                handlingFigure('handling', 'Handling', caps.efficiency),
                travelDrainFigure('drain', 'Drain', caps.drain),
            ]
        case 'warp':
            return [jumpFigure('jump', 'Jump distance', caps.range)]
        case 'launcher':
            return [
                {
                    key: 'charge',
                    label: 'Charge',
                    value: launchChargePerMinute(caps.chargeRate),
                    unit: 't/min',
                    text: formatTonnesRate(launchChargePerMinute(caps.chargeRate), 1),
                },
                {
                    key: 'launchSpeed',
                    label: 'Launch speed',
                    value: caps.velocity,
                    unit: 'ly/s',
                    text: `${formatFixed(caps.velocity)} ly/s`,
                },
                {
                    key: 'drain',
                    label: 'Drain',
                    value: launchDrainPerKiloTonneLy(caps.drain),
                    unit: 'energy/k t per ly',
                    text: `${formatFixed(launchDrainPerKiloTonneLy(caps.drain))} energy/k t per ly`,
                },
            ]
        case 'gatherer':
            return [
                yieldFigure('yield', 'Yield', caps.yield),
                depthFigure('depth', 'Depth', caps.depth),
                gatherDrainFigure('drain', 'Drain', caps.drain),
            ]
        case 'loader':
            return [
                transferFigure('transfer', 'Transfer', caps.thrust, caps.mass),
                countFigure('shuttles', 'Shuttles', caps.quantity),
            ]
        case 'crafter':
        case 'builder':
            return [
                inputSpeedFigure('speed', 'Speed', caps.speed),
                craftDrainFigure('drain', 'Drain', caps.drain),
            ]
    }
}

export function getModuleFigures(
    itemId: number,
    stats: bigint | UInt64Type
): ModuleFigures | undefined {
    const caps = computeModuleCapabilities(itemId, BigInt(String(stats)))
    if (!caps) return undefined
    const section = MODULE_FIGURE_SECTION[caps.kind]
    return {
        itemId,
        kind: caps.kind,
        section,
        sectionLabel: FIGURE_SECTION_LABELS[section],
        rows: moduleRows(caps),
    }
}
