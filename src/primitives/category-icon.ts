import type { CategoryIconShape } from '@shipload/sdk'
import { el } from './svg.ts'

export interface CategoryIconPathOpts {
  shape: CategoryIconShape
  cx: number
  cy: number
  size: number
  color: string
}

export interface CategoryIconSvgOpts {
  size?: number
  color?: string
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`)
  }
  return pts.join(' ')
}

function diamondPoints(cx: number, cy: number, r: number): string {
  return [
    `${cx.toFixed(2)},${(cy - r).toFixed(2)}`,
    `${(cx + r).toFixed(2)},${cy.toFixed(2)}`,
    `${cx.toFixed(2)},${(cy + r).toFixed(2)}`,
    `${(cx - r).toFixed(2)},${cy.toFixed(2)}`,
  ].join(' ')
}

function starPoints(cx: number, cy: number, r: number): string {
  const inner = r * 0.45
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2
    const radius = i % 2 === 0 ? r : inner
    pts.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`)
  }
  return pts.join(' ')
}

export function categoryIconPath({ shape, cx, cy, size, color }: CategoryIconPathOpts): string {
  const r = size / 2
  switch (shape) {
    case 'hex':
      return el('polygon', { points: hexPoints(cx, cy, r), fill: color })
    case 'diamond':
      return el('polygon', { points: diamondPoints(cx, cy, r), fill: color })
    case 'star':
      return el('polygon', { points: starPoints(cx, cy, r), fill: color })
    case 'circle':
      return el('circle', { cx, cy, r, fill: color })
    case 'square':
      return el('rect', { x: cx - r, y: cy - r, width: size, height: size, fill: color })
  }
}

export function categoryIconSvg(shape: CategoryIconShape, opts: CategoryIconSvgOpts = {}): string {
  const size = opts.size ?? 16
  const color = opts.color ?? '#ffffff'
  const cx = size / 2
  const cy = size / 2
  const iconSize = size * 0.85
  const inner = categoryIconPath({ shape, cx, cy, size: iconSize, color })
  return el(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: `0 0 ${size} ${size}`,
    },
    inner,
  )
}
