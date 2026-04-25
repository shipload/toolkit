import type { ResolvedItem, ResourceTier } from '@shipload/sdk'
import { tierColors, categoryColors, categoryIconShapes } from '@shipload/sdk'
import { el } from '../primitives/svg.ts'
import { text } from '../primitives/text.ts'
import { categoryIconPath } from '../primitives/category-icon.ts'
import { tokens } from '../tokens/index.ts'

function tierKey(tier: number): ResourceTier {
  return `t${tier}` as ResourceTier
}

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
  const height = Math.round(size * 1.25)
  const r = Math.max(4, Math.round(size * 0.12))
  const cx = size / 2

  const border = el('rect', {
    x: 0.5,
    y: 0.5,
    width: size - 1,
    height: height - 1,
    rx: r,
    ry: r,
    fill: tokens.colors.surface.panel,
    stroke: tierColors[tierKey(props.resolved.tier)] ?? tokens.colors.surface.panelBorder,
    'stroke-width': 1.5,
  })

  let content = ''
  if (props.resolved.abbreviation) {
    const iconCy = size * 0.45
    content = text({
      x: cx,
      y: iconCy,
      value: props.resolved.abbreviation,
      size: Math.round(size * 0.28),
      weight: 700,
      anchor: 'middle',
      color: tokens.colors.text.primary,
      family: tokens.typography.display,
    })
  } else if (props.resolved.category) {
    const shape = categoryIconShapes[props.resolved.category]
    const color = categoryColors[props.resolved.category]
    const iconCy = size * 0.4
    content = categoryIconPath({ shape, cx, cy: iconCy, size: size * 0.32, color, strokeWidth: 1.5 })
  } else if (props.resolved.icon) {
    content = text({
      x: cx,
      y: size * 0.4,
      value: props.resolved.icon,
      size: Math.round(size * 0.44),
      weight: 400,
      anchor: 'middle',
      dominantBaseline: 'central',
      color: tokens.colors.text.primary,
    })
  }

  const qty = props.quantity ?? 0
  let quantityText = ''
  if (qty > 1) {
    const qtyFontSize = Math.max(9, Math.round(size * 0.22))
    const qtyPad = Math.max(3, Math.round(size * 0.12))
    quantityText = text({
      x: size - qtyPad,
      y: height - qtyPad,
      value: String(qty),
      size: qtyFontSize,
      weight: 700,
      anchor: 'end',
      color: tokens.colors.text.primary,
      family: tokens.typography.display,
    })
  }

  return border + content + quantityText
}

export function itemCellGroup(props: ItemCellGroupProps): string {
  return `<g transform="translate(${props.x}, ${props.y})">${cellInner(props)}</g>`
}

export function renderItemCell(props: ItemCellProps): string {
  const size = props.size ?? 48
  const height = Math.round(size * 1.25)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}">${cellInner(props)}</svg>`
}
