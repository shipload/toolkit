import { tokens } from '../tokens/index.ts'

export function formatMass(n: number): string {
  return n.toLocaleString('en-US')
}

export function tierBorder(tier: number): string {
  const key = `t${tier}` as keyof typeof tokens.colors.tier
  return tokens.colors.tier[key] ?? tokens.colors.surface.panelBorder
}

export function shortCode(itemId: number): string {
  const str = itemId.toString(10)
  return str.slice(-2).padStart(2, '0')
}
