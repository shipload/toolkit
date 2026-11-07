import {MASS_UNITS_PER_TONNE} from '../types'
import {compose, defineText, formatNumber, hasText} from '../text/registry'

const UNIT_TEMPLATES: Record<string, string> = {
    ly: '{value} ly',
    'ly/hr': '{value} ly/hr',
    'ly/s': '{value} ly/s',
    energy: '{value} energy',
    'energy/ly': '{value} energy/ly',
    'energy/min': '{value} energy/min',
    'energy/k t': '{value} energy/k t',
    'energy/k t per ly': '{value} energy/k t per ly',
    t: '{value} t',
    't/min': '{value} t/min',
    km: '{value} km',
    '%': '{value}%',
    min: '{value} min',
}

function unitId(unit: string): string {
    return `unit.${unit.replace(/%/g, 'percent').replace(/\//g, '-per-').replace(/ /g, '-')}`
}

for (const [unit, template] of Object.entries(UNIT_TEMPLATES)) {
    defineText({[unitId(unit)]: template})
}

defineText({
    'compose.thousands': '{value}k',
    'compose.millions': '{value}M',
    'compose.signed': '+{value}',
})

export function withUnit(unit: string, value: string): string {
    const id = unitId(unit)
    return unit && hasText(id) ? compose(id, {value}) : value
}

export function formatFixed(value: number, decimals = 0): string {
    const rounded = Number(value.toFixed(decimals))
    return formatNumber(Object.is(rounded, -0) ? 0 : rounded, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })
}

function formatAbbreviated(value: number, suffix: 'k' | 'M'): string | undefined {
    const id = suffix === 'k' ? 'compose.thousands' : 'compose.millions'
    const tenths = Math.round(value * 10) / 10
    if (tenths < 100) return compose(id, {value: formatFixed(tenths, 1)})
    const whole = Math.round(value)
    if (whole < 1000 || suffix === 'M') return compose(id, {value: formatNumber(whole)})
    return undefined
}

export function formatDistanceValue(value: number): string {
    const sign = value < 0 ? '-' : ''
    const abs = Math.abs(value)
    const tenths = Math.round(abs * 10) / 10
    if (tenths < 100) return `${sign}${formatFixed(tenths, 1)}`
    const whole = Math.round(abs)
    if (whole < 10_000) return `${sign}${formatNumber(whole)}`
    return `${sign}${formatAbbreviated(abs / 1000, 'k') ?? formatAbbreviated(abs / 1_000_000, 'M')}`
}

export function formatDistance(ly: number): string {
    return withUnit('ly', formatDistanceValue(ly))
}

export function formatPerDistance(value: number): string {
    return withUnit('energy/ly', formatDistanceValue(value))
}

export function formatTonnesRateValue(tonnesPerMinute: number, decimals: number): string {
    if (Math.abs(tonnesPerMinute) >= 1000) {
        return compose('compose.thousands', {value: formatFixed(tonnesPerMinute / 1000, 1)})
    }
    return formatFixed(tonnesPerMinute, decimals)
}

export function formatTonnesRate(tonnesPerMinute: number, decimals: number): string {
    return withUnit('t/min', formatTonnesRateValue(tonnesPerMinute, decimals))
}

export function formatFigureTonnesValue(massUnits: number): string {
    const tonnes = massUnits / MASS_UNITS_PER_TONNE
    const decimals = Math.abs(tonnes) < 100 && !Number.isInteger(tonnes) ? 1 : 0
    return formatFixed(tonnes, decimals)
}

export function formatFigureTonnes(massUnits: number): string {
    return withUnit('t', formatFigureTonnesValue(massUnits))
}

export function signed(text: string): string {
    return text.startsWith('-') ? text : compose('compose.signed', {value: text})
}
