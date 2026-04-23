import type { ResolvedItem } from '@shipload/sdk'
import { getStatDefinitions, categoryColors, displayName } from '@shipload/sdk'
import type { CargoItem } from '../payload/codec.ts'
import { panel } from '../primitives/panel.ts'
import { iconHex } from '../primitives/icon-hex.ts'
import { text } from '../primitives/text.ts'
import { divider } from '../primitives/divider.ts'
import { statBar } from '../primitives/stat-bar.ts'
import { quantityBadge } from '../primitives/quantity-badge.ts'
import { tokens } from '../tokens/index.ts'
import { shortCode, formatMass, tierBorder } from './_shared.ts'

const CATEGORY_LABELS: Record<string, string> = {
  ore: 'Ore',
  crystal: 'Crystal',
  gas: 'Gas',
  regolith: 'Regolith',
  biomass: 'Biomass',
}

function categoryColor(category?: string): string {
  if (!category) return tokens.colors.text.muted
  const key = category as keyof typeof tokens.colors.category
  return tokens.colors.category[key] ?? tokens.colors.text.muted
}

export interface RenderResourceOpts {
  mode?: 'values' | 'ranges'
}

type StatRow = {
  label: string
  abbreviation: string
  value: number | null
  color: string
  inverted?: boolean
}

export function renderResource(
  item: CargoItem,
  resolved: ResolvedItem,
  opts?: RenderResourceOpts,
): string {
  const mode = opts?.mode ?? 'values'
  const w = tokens.spacing.panelWidth
  const pad = tokens.spacing.panelPadding
  const innerW = w - pad * 2

  let rows: StatRow[]
  if (mode === 'values') {
    rows = (resolved.stats ?? []).map(s => ({
      label: s.label,
      abbreviation: s.abbreviation,
      value: s.value,
      color: s.color,
      inverted: s.inverted,
    }))
  } else {
    const defs = resolved.category ? getStatDefinitions(resolved.category) : []
    const color = resolved.category
      ? categoryColors[resolved.category]
      : tokens.colors.text.muted
    rows = defs.map(d => ({
      label: d.label,
      abbreviation: d.abbreviation,
      value: null,
      color,
      inverted: d.inverted,
    }))
  }

  const headerH = 48
  const metaRowH = 28
  const statsH = rows.length * 26 + 8
  const height = headerH + metaRowH + 14 + statsH + pad

  const chrome = panel({ width: w, height, borderColor: tierBorder(resolved.tier) })

  const quantity = Number(BigInt(item.quantity.toString()))
  const badge = quantityBadge({ x: w - pad, y: pad, quantity })

  const icon = iconHex({
    x: pad,
    y: pad + 4,
    color: categoryColor(resolved.category),
    code: shortCode(resolved.itemId),
  })

  const name = text({
    x: pad + 34,
    y: pad + 22,
    value: displayName(resolved),
    size: tokens.typography.sizes.title,
    weight: 700,
    family: tokens.typography.display,
  })

  const catLabel = resolved.category ? (CATEGORY_LABELS[resolved.category] ?? 'Item') : 'Item'
  const catText = text({
    x: pad,
    y: pad + headerH + 4,
    value: 'Category',
    size: tokens.typography.sizes.body,
    color: tokens.colors.text.secondary,
  })
  const catValue = text({
    x: w - pad,
    y: pad + headerH + 4,
    value: catLabel,
    size: tokens.typography.sizes.body,
    weight: 600,
    anchor: 'end',
  })
  const massLabel = text({
    x: pad,
    y: pad + headerH + metaRowH - 8,
    value: 'Mass',
    size: tokens.typography.sizes.body,
    color: tokens.colors.text.secondary,
  })
  const massValue = text({
    x: w - pad,
    y: pad + headerH + metaRowH - 8,
    value: formatMass(resolved.mass),
    size: tokens.typography.sizes.body,
    weight: 600,
    anchor: 'end',
  })

  const sepY = pad + headerH + metaRowH + 6
  const sep = divider({ x: pad, y: sepY, width: innerW })

  const statsSvg = rows
    .map((row, i) =>
      statBar({
        x: pad,
        y: sepY + 18 + i * 26,
        width: innerW,
        label: row.label,
        abbreviation: row.abbreviation,
        value: row.value,
        color: row.color,
        inverted: row.inverted,
      }),
    )
    .join('')

  const inner = `${chrome}${icon}${name}${badge}${catText}${catValue}${massLabel}${massValue}${sep}${statsSvg}`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${inner}</svg>`
}
