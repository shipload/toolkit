export function formatMass(kg: number): string {
    const t = kg / 1000
    const fixed = t.toFixed(2)
    const trimmed = fixed.replace(/\.?0+$/, '')
    return `${trimmed} t`
}

export function formatMassDelta(kg: number): string {
    if (kg === 0) return '0 t'
    const sign = kg > 0 ? '+' : '-'
    return `${sign}${formatMass(Math.abs(kg))}`
}
