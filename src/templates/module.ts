import type { ResolvedItem } from '@shipload/sdk'
import type { CargoItem } from '../payload/codec.ts'
import { panel } from '../primitives/panel.ts'
import { iconHex } from '../primitives/icon-hex.ts'
import { text } from '../primitives/text.ts'
import { divider } from '../primitives/divider.ts'
import { compactRow } from '../primitives/compact-row.ts'
import { quantityBadge } from '../primitives/quantity-badge.ts'
import { tokens } from '../tokens/index.ts'
import { shortCode, formatMass, tierBorder } from './_shared.ts'

function capabilityColor(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, '') as keyof typeof tokens.colors.capability
  return tokens.colors.capability[key] ?? tokens.colors.accent.component
}

export function renderModule(item: CargoItem, resolved: ResolvedItem): string {
  const w = tokens.spacing.panelWidth
  const pad = tokens.spacing.panelPadding
  const innerW = w - pad * 2

  const group = resolved.attributes?.[0]
  const attrs = group?.attributes ?? []

  const headerH = 48
  const metaRowH = 28
  const capHeaderH = attrs.length > 0 ? 22 : 0
  const attrsH = attrs.length * 18
  const height = headerH + metaRowH + 14 + (attrs.length > 0 ? capHeaderH + attrsH + 8 : 0) + pad

  const chrome = panel({ width: w, height, borderColor: tierBorder(resolved.tier) })

  const quantity = Number(BigInt(item.quantity.toString()))
  const badge = quantityBadge({ x: w - pad, y: pad, quantity })

  const iconColor = group ? capabilityColor(group.capability) : tokens.colors.accent.component
  const icon = iconHex({
    x: pad,
    y: pad + 4,
    color: iconColor,
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

  const tierNum = resolved.tier.replace(/^t/i, '')
  const subtitleLabel = text({
    x: pad,
    y: pad + headerH + 4,
    value: 'Type',
    size: tokens.typography.sizes.body,
    color: tokens.colors.text.secondary,
  })
  const subtitleValue = text({
    x: w - pad,
    y: pad + headerH + 4,
    value: `MODULE · T${tierNum}`,
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

  let capSection = ''
  if (attrs.length > 0 && group) {
    const capY = sepY + capHeaderH
    const capHeader = text({
      x: pad,
      y: capY,
      value: group.capability.toUpperCase(),
      size: 10,
      weight: 700,
      family: tokens.typography.sans,
      color: capabilityColor(group.capability),
      letterSpacing: 0.8,
    })

    const attrRows = attrs
      .map((attr, i) => {
        const displayValue = String(attr.value)
        return compactRow({
          x: pad,
          y: capY + 14 + i * 18,
          width: innerW,
          label: attr.label,
          value: displayValue,
        })
      })
      .join('')

    capSection = capHeader + attrRows
  }

  const inner = `${chrome}${icon}${name}${badge}${subtitleLabel}${subtitleValue}${massLabel}${massValue}${sep}${capSection}`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${inner}</svg>`
}
