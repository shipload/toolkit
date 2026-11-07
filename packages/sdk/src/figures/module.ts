import type {UInt64Type} from '@wharfkit/antelope'
import {computeModuleCapabilities, type ModuleCapabilities} from '../derivation/capabilities'
import {computeTravelDrain} from '../nft/description'
import {
    craftDrainPerKiloTonne,
    cruiseSpeedLyPerHour,
    gatherDrainPerMinute,
    handlingPercentPerContainer,
    payloadPercent,
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
    formatDistanceValue,
    formatFigureTonnesValue,
    formatFixed,
    formatTonnesRateValue,
    signed,
    withUnit,
} from './format'
import {compose, defineText, text} from '../text/registry'
import {
    FIGURE_SECTION_LABELS,
    figureLabel,
    MODULE_FIGURE_SECTION,
    type Figure,
    type ModuleFigures,
} from './types'
import {MASS_UNITS_PER_TONNE} from '../types'

defineText({
    'figure.warp.note': 'Spends a full charge; the hold must be empty.',
    'figure.tows.one': '{count} container, T{tier} and below',
    'figure.tows.many': '{count} containers, T{tier} and below',
    'figure.handling.text': '+{value}% travel time per towed container, plus its weight',
})

export function makeFigure(
    key: string,
    value: number,
    unit: string,
    number: string,
    plus = false
): Figure {
    const shown = plus ? signed(number) : number
    return {key, label: figureLabel(key), value, unit, number: shown, text: withUnit(unit, shown)}
}

export function speedFigure(key: string, lyPerHour: number): Figure {
    return makeFigure(key, lyPerHour, 'ly/hr', formatFixed(lyPerHour))
}

export function travelDrainFigure(key: string, drainMilli: number): Figure {
    const value = travelDrainPerLy(drainMilli)
    return makeFigure(key, value, 'energy/ly', formatDistanceValue(value))
}

export function energyFigure(key: string, milli: number, plus = false): Figure {
    const value = milliToEnergy(milli)
    return makeFigure(key, value, 'energy', formatFixed(value), plus)
}

export function rechargeFigure(key: string, milliPerSecond: number, plus = false): Figure {
    const value = rechargePerMinute(milliPerSecond)
    return makeFigure(key, value, 'energy/min', formatFixed(value), plus)
}

export function tonnesFigure(key: string, massUnits: number, plus = false): Figure {
    return makeFigure(
        key,
        massUnits / MASS_UNITS_PER_TONNE,
        't',
        formatFigureTonnesValue(massUnits),
        plus
    )
}

export function distanceFigure(key: string, ly: number): Figure {
    return makeFigure(key, ly, 'ly', formatDistanceValue(ly))
}

export function yieldFigure(key: string, yieldValue: number): Figure {
    const value = referenceYieldPerMinute(yieldValue)
    return makeFigure(key, value, 't/min', formatTonnesRateValue(value, 1))
}

export function depthFigure(key: string, depth: number): Figure {
    return makeFigure(key, depth, 'km', formatFixed(depth))
}

export function gatherDrainFigure(key: string, drain: number): Figure {
    const value = gatherDrainPerMinute(drain)
    return makeFigure(key, value, 'energy/min', formatFixed(value, 1))
}

export function inputSpeedFigure(key: string, speed: number): Figure {
    const value = inputTonnesPerMinute(speed)
    return makeFigure(key, value, 't/min', formatTonnesRateValue(value, 1))
}

export function craftDrainFigure(key: string, drain: number): Figure {
    const value = craftDrainPerKiloTonne(drain)
    return makeFigure(key, value, 'energy/k t', formatFixed(value))
}

export function transferFigure(key: string, thrust: number, payload: number): Figure {
    const value = referenceTransferPerMinute(thrust, payload)
    return makeFigure(key, value, 't/min', formatTonnesRateValue(value, 0))
}

export function payloadFigure(key: string, payload: number): Figure {
    const value = payloadPercent(payload)
    return makeFigure(key, value, '%', formatFixed(value, 1))
}

export function countFigure(key: string, count: number): Figure {
    return makeFigure(key, count, '', formatFixed(count))
}

export function towsText(byTier: {tier: number; capacity: number}[]): string {
    return byTier
        .map(({tier, capacity}) =>
            compose(capacity === 1 ? 'figure.tows.one' : 'figure.tows.many', {
                count: formatFixed(capacity),
                tier: String(tier),
            })
        )
        .join(text('compose.separator.clauses'))
}

export function towsFigure(key: string, byTier: {tier: number; capacity: number}[]): Figure {
    const value = byTier.reduce((sum, entry) => sum + entry.capacity, 0)
    const shown = towsText(byTier)
    return {key, label: figureLabel(key), value, unit: 'containers', number: shown, text: shown}
}

export function handlingFigure(key: string, efficiency: number): Figure {
    const value = handlingPercentPerContainer(efficiency)
    const shown = compose('figure.handling.text', {value: formatFixed(value)})
    return {key, label: figureLabel(key), value, unit: '%', number: shown, text: shown}
}

export function warpJumpNote(): string {
    return text('figure.warp.note')
}

export function jumpFigure(key: string, range: number): Figure {
    return {...distanceFigure(key, range), note: warpJumpNote()}
}

function moduleRows(caps: ModuleCapabilities): Figure[] {
    switch (caps.kind) {
        case 'engine':
            return [
                speedFigure('speed', cruiseSpeedLyPerHour(caps.thrust, REFERENCE_MASS)),
                travelDrainFigure('drain', computeTravelDrain(caps.thrust, caps.thermal)),
            ]
        case 'generator':
            return [
                energyFigure('capacity', caps.capacity, true),
                rechargeFigure('recharge', caps.recharge, true),
            ]
        case 'battery':
            return [energyFigure('capacity', caps.capacity, true)]
        case 'storage':
            return [
                tonnesFigure('capacity', caps.capacity, true),
                travelDrainFigure('drain', caps.drain),
            ]
        case 'hauler':
            return [
                towsFigure('tows', [{tier: caps.tier, capacity: caps.capacity}]),
                handlingFigure('handling', caps.efficiency),
                travelDrainFigure('drain', caps.drain),
            ]
        case 'warp':
            return [jumpFigure('jump', caps.range)]
        case 'launcher':
            return [
                makeFigure(
                    'charge',
                    launchChargePerMinute(caps.chargeRate),
                    't/min',
                    formatTonnesRateValue(launchChargePerMinute(caps.chargeRate), 1)
                ),
                makeFigure('launchSpeed', caps.velocity, 'ly/s', formatFixed(caps.velocity)),
                makeFigure(
                    'drain',
                    launchDrainPerKiloTonneLy(caps.drain),
                    'energy/k t per ly',
                    formatFixed(launchDrainPerKiloTonneLy(caps.drain))
                ),
            ]
        case 'gatherer':
            return [
                yieldFigure('yield', caps.yield),
                depthFigure('depth', caps.depth),
                gatherDrainFigure('drain', caps.drain),
            ]
        case 'loader':
            return [
                transferFigure('transfer', caps.thrust, caps.payload),
                payloadFigure('payload', caps.payload),
                countFigure('shuttles', caps.quantity),
            ]
        case 'crafter':
        case 'builder':
            return [inputSpeedFigure('speed', caps.speed), craftDrainFigure('drain', caps.drain)]
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
