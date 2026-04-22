import { el } from './svg.ts'
import { text } from './text.ts'
import { tokens } from '../tokens/index.ts'

export interface StatBarProps {
  x: number
  y: number
  width: number
  label: string
  abbreviation: string
  value: number | null // 0..1023, or null for ranges mode (no value text, no fill)
  color: string
  inverted?: boolean
}

export function statBar({
  x,
  y,
  width,
  label,
  abbreviation,
  value,
  color,
  inverted,
}: StatBarProps): string {
  const h = tokens.spacing.statBarHeight

  let labelOut =
    text({
      x,
      y: y - 6,
      value: abbreviation,
      size: tokens.typography.sizes.label,
      weight: 700,
      family: tokens.typography.mono,
      color,
    }) +
    text({
      x: x + 22,
      y: y - 6,
      value: label,
      size: tokens.typography.sizes.stat,
      weight: 400,
      color: tokens.colors.text.primary,
    })

  const track = el('rect', {
    x,
    y,
    width,
    height: h,
    rx: h / 2,
    ry: h / 2,
    fill: tokens.colors.surface.panelBorder,
  })

  if (value !== null) {
    const clamped = Math.max(0, Math.min(1023, value))
    const displayFraction = inverted ? 1 - clamped / 1023 : clamped / 1023
    const filled = Math.floor(width * displayFraction)

    labelOut += text({
      x: x + width,
      y: y - 6,
      value: String(clamped),
      size: tokens.typography.sizes.statValue,
      weight: 700,
      color,
      anchor: 'end',
    })

    const bar = el('rect', {
      x,
      y,
      width: filled,
      height: h,
      rx: h / 2,
      ry: h / 2,
      fill: color,
    })
    return labelOut + track + bar
  }

  return labelOut + track
}
