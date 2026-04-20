import type { ResolvedItem } from '@shipload/sdk'
import type { CargoItem } from '../payload/codec.ts'
import { panel } from '../primitives/panel.ts'
import { iconHex } from '../primitives/icon-hex.ts'
import { text } from '../primitives/text.ts'
import { divider } from '../primitives/divider.ts'
import { statBar } from '../primitives/stat-bar.ts'
import { quantityBadge } from '../primitives/quantity-badge.ts'
import { tokens } from '../tokens/index.ts'

const CATEGORY_LABELS: Record<string, string> = {
  metal: 'Metals',
  gas: 'Gas',
  mineral: 'Minerals',
  organic: 'Organic',
  precious: 'Precious',
}

function formatMass(n: number): string {
  return n.toLocaleString('en-US')
}

function tierBorder(tier: string): string {
  const key = tier.toLowerCase() as keyof typeof tokens.colors.tier
  return tokens.colors.tier[key] ?? tokens.colors.surface.panelBorder
}

function categoryColor(category?: string): string {
  if (!category) return tokens.colors.text.muted
  const key = category as keyof typeof tokens.colors.category
  return tokens.colors.category[key] ?? tokens.colors.text.muted
}

function shortCode(itemId: number): string {
  const str = itemId.toString(10)
  return str.slice(-2).padStart(2, '0')
}

export function renderResource(item: CargoItem, resolved: ResolvedItem): string {
  const w = tokens.spacing.panelWidth
  const pad = tokens.spacing.panelPadding
  const innerW = w - pad * 2

  const stats = resolved.stats ?? []
  const headerH = 48
  const metaRowH = 28
  const statsH = stats.length * 26 + 8
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
    value: resolved.name,
    size: tokens.typography.sizes.title,
    weight: 700,
    family: tokens.typography.display,
  })

  const catLabel = CATEGORY_LABELS[(resolved.category ?? 'metal') as string] ?? 'Item'
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

  const statsSvg = stats
    .map((stat, i) =>
      statBar({
        x: pad,
        y: sepY + 18 + i * 26,
        width: innerW,
        label: stat.label,
        abbreviation: stat.abbreviation,
        value: stat.value,
        color: stat.color,
        inverted: stat.inverted,
      }),
    )
    .join('')

  const inner = `${chrome}${icon}${name}${badge}${catText}${catValue}${massLabel}${massValue}${sep}${statsSvg}`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${inner}</svg>`
}
