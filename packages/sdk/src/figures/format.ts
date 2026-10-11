import {MASS_UNITS_PER_TONNE} from '../types'

export function formatFixed(value: number, decimals = 0): string {
    const rounded = Number(value.toFixed(decimals))
    return (Object.is(rounded, -0) ? 0 : rounded).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })
}

function formatAbbreviated(value: number, suffix: string): string | undefined {
    const tenths = Math.round(value * 10) / 10
    if (tenths < 100) return `${tenths.toFixed(1)}${suffix}`
    const whole = Math.round(value)
    if (whole < 1000 || suffix === 'M') return `${whole.toLocaleString('en-US')}${suffix}`
    return undefined
}

export function formatDistanceValue(value: number): string {
    const sign = value < 0 ? '-' : ''
    const abs = Math.abs(value)
    const tenths = Math.round(abs * 10) / 10
    if (tenths < 100) return `${sign}${tenths.toFixed(1)}`
    const whole = Math.round(abs)
    if (whole < 10_000) return `${sign}${whole.toLocaleString('en-US')}`
    return `${sign}${formatAbbreviated(abs / 1000, 'k') ?? formatAbbreviated(abs / 1_000_000, 'M')}`
}

export function formatDistance(ly: number): string {
    return `${formatDistanceValue(ly)} ly`
}

export function formatPerDistance(value: number, unit = 'energy'): string {
    return `${formatDistanceValue(value)} ${unit}/ly`
}

export function formatTonnesRate(tonnesPerMinute: number, decimals: number): string {
    if (Math.abs(tonnesPerMinute) >= 1000) {
        return `${formatFixed(tonnesPerMinute / 1000, 1)}k t/min`
    }
    return `${formatFixed(tonnesPerMinute, decimals)} t/min`
}

export function formatFigureTonnes(massUnits: number): string {
    const tonnes = massUnits / MASS_UNITS_PER_TONNE
    const decimals = Math.abs(tonnes) < 100 && !Number.isInteger(tonnes) ? 1 : 0
    return `${formatFixed(tonnes, decimals)} t`
}

export function signed(text: string): string {
    return text.startsWith('-') ? text : `+${text}`
}
