import { el } from './svg.ts'
import { text } from './text.ts'
import { tokens } from '../tokens/index.ts'

export interface IconHexProps {
  x: number
  y: number
  color: string
  code: string
}

export function iconHex({ x, y, color, code }: IconHexProps): string {
  const size = tokens.spacing.iconHexSize
  const h = size
  const w = size * 1.1547 // flat-top hex aspect
  const cx = x + w / 2
  const cy = y + h / 2
  const points = [
    [cx - w / 2, cy],
    [cx - w / 4, cy - h / 2],
    [cx + w / 4, cy - h / 2],
    [cx + w / 2, cy],
    [cx + w / 4, cy + h / 2],
    [cx - w / 4, cy + h / 2],
  ].map(([px, py]) => `${px?.toFixed(1)},${py?.toFixed(1)}`).join(' ')
  return (
    el('polygon', { points, fill: 'none', stroke: color, 'stroke-width': 1.5 }) +
    text({
      x: cx,
      y: cy + 3,
      value: code,
      size: 9,
      weight: 700,
      family: tokens.typography.mono,
      color,
      anchor: 'middle',
    })
  )
}
