import {tokens} from '../tokens/index.ts'

export function formatMass(n: number): string {
    return n.toLocaleString('en-US')
}

export function tierBorder(tier: number): string {
    return tokens.colors.tier[tier] ?? tokens.colors.surface.panelBorder
}

export function shortCode(itemId: number): string {
    const str = itemId.toString(10)
    return str.slice(-2).padStart(2, '0')
}
