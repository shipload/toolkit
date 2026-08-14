export function formatMass(kg: number): string {
    if (kg === 0) return '0 t'
    const sign = kg < 0 ? '-' : ''
    const centitonnes = Math.round(Math.abs(kg) / 10)
    const t = Math.floor(centitonnes / 100)
    const frac = centitonnes % 100
    if (frac === 0) return `${sign}${t} t`
    const fracStr = String(frac).padStart(2, '0').replace(/0$/, '')
    return `${sign}${t}.${fracStr} t`
}

export function formatMassDelta(kg: number): string {
    if (kg === 0) return '0 t'
    const sign = kg > 0 ? '+' : '-'
    return `${sign}${formatMass(Math.abs(kg))}`
}

export function formatLocation(loc: {x: number; y: number}): string {
    return `${loc.x}, ${loc.y}`
}

function trim(n: number, digits = 1): string {
    return n.toFixed(digits).replace(/\.?0+$/, '')
}

export function formatMassScaled(kg: number): string {
    if (kg === 0) return '0 t'
    const sign = kg < 0 ? '-' : ''
    const tonnes = Math.abs(kg) / 1000
    if (tonnes >= 1_000_000_000) return `${sign}${trim(tonnes / 1_000_000_000)}b t`
    if (tonnes >= 1_000_000) return `${sign}${trim(tonnes / 1_000_000)}m t`
    if (tonnes >= 1_000) return `${sign}${trim(tonnes / 1_000)}k t`
    return formatMass(kg)
}

export function formatInfluence(atomic: bigint | number | string): string {
    const points = BigInt(String(atomic)) / 10_000n
    return `${points.toLocaleString('en-US')} pts`
}

export function formatNeedMultiplier(needFp: bigint | number | string): string {
    return `×${(Number(BigInt(String(needFp))) / 10_000).toFixed(1)}`
}
