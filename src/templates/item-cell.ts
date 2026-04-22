import type { ResolvedItem } from '@shipload/sdk'
import { tierColors, categoryColors, categoryIconShapes } from '@shipload/sdk'
import { el } from '../primitives/svg.ts'
import { text } from '../primitives/text.ts'
import { categoryIconPath } from '../primitives/category-icon.ts'
import { quantityBadge } from '../primitives/quantity-badge.ts'
import { tokens } from '../tokens/index.ts'

export interface ItemCellProps {
  resolved: ResolvedItem
  quantity?: number
  size?: number
}

export interface ItemCellGroupProps extends ItemCellProps {
  x: number
  y: number
}

function cellInner(props: ItemCellProps): string {
  const size = props.size ?? 48
  const r = Math.max(4, Math.round(size * 0.12))
  const cx = size / 2
  const cy = size / 2

  const border = el('rect', {
    x: 0.5,
    y: 0.5,
    width: size - 1,
    height: size - 1,
    rx: r,
    ry: r,
    fill: tokens.colors.surface.panel,
    stroke: tierColors[props.resolved.tier],
    'stroke-width': 1.5,
  })

  let content = ''
  if (props.resolved.abbreviation) {
    content = text({
      x: cx,
      y: cy + size * 0.12,
      value: props.resolved.abbreviation,
      size: Math.round(size * 0.36),
      weight: 700,
      anchor: 'middle',
      color: tokens.colors.text.primary,
      family: tokens.typography.display,
    })
  } else if (props.resolved.category) {
    const shape = categoryIconShapes[props.resolved.category]
    const color = categoryColors[props.resolved.category]
    content = categoryIconPath({ shape, cx, cy, size: size * 0.55, color })
  }

  const badgeY = size - tokens.spacing.quantityBadgeHeight - 2
  const badge = quantityBadge({ x: size, y: badgeY, quantity: props.quantity ?? 0 })

  return border + content + badge
}

export function itemCellGroup(props: ItemCellGroupProps): string {
  return `<g transform="translate(${props.x}, ${props.y})">${cellInner(props)}</g>`
}

export function renderItemCell(props: ItemCellProps): string {
  const size = props.size ?? 48
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${cellInner(props)}</svg>`
}
