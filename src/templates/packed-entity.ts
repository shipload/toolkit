import { describeModuleForSlot, renderDescription, type ResolvedItem, type TextSpan } from '@shipload/sdk'
import type { CargoItem } from '../payload/codec.ts'
import { panel } from '../primitives/panel.ts'
import { iconHex } from '../primitives/icon-hex.ts'
import { text } from '../primitives/text.ts'
import { divider } from '../primitives/divider.ts'
import { moduleSlot } from '../primitives/module-slot.ts'
import { quantityBadge } from '../primitives/quantity-badge.ts'
import { wrapText } from '../primitives/wrap.ts'
import { tokens } from '../tokens/index.ts'

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

function tierBorder(tier: string): string {
  const key = tier.toLowerCase() as keyof typeof tokens.colors.tier
  return tokens.colors.tier[key] ?? tokens.colors.surface.panelBorder
}

function buildHullRows(
  resolved: ResolvedItem,
): { label: string; value: number }[] {
  const hullGroup = resolved.attributes?.find((g) => g.capability.toLowerCase() === 'hull')
  return hullGroup?.attributes ?? []
}

function buildModuleGroups(
  resolved: ResolvedItem,
): { capability: string; description: TextSpan[] | string; installed: boolean }[] {
  const slots = resolved.moduleSlots ?? []
  return slots.map((slot) => {
    if (!slot.installed || !slot.attributes || !slot.name) {
      return { capability: 'Module', description: '', installed: false }
    }
    const desc = describeModuleForSlot(slot)
    if (desc) {
      return {
        capability: slot.name,
        description: renderDescription(desc),
        installed: true,
      }
    }
    const shorthand = slot.attributes
      .map((a) => `${a.value} ${a.label.toLowerCase()}`)
      .join(' · ')
    return { capability: slot.name, description: shorthand, installed: true }
  })
}

const MODULE_LABEL_PREFIX = (capability: string) => `${capability}: `

function rowHeightFor(m: { capability: string; description: TextSpan[] | string; installed: boolean }): number {
  if (!m.installed) return 24
  const plain =
    typeof m.description === 'string'
      ? m.description
      : m.description.map((s) => s.text).join('')
  if (plain.length === 0) return 24
  const combined = MODULE_LABEL_PREFIX(m.capability) + plain
  const lineCount = Math.max(1, wrapText({ value: combined, charsPerLine: 36 }).length)
  return 10 + lineCount * 14
}

export function renderPackedEntity(item: CargoItem, resolved: ResolvedItem): string {
  const w = tokens.spacing.panelWidth
  const pad = tokens.spacing.panelPadding
  const innerW = w - pad * 2
  const quantity = Number(BigInt(item.quantity.toString()))

  const hullRows = buildHullRows(resolved)
  const moduleGroups = buildModuleGroups(resolved)

  const displayName = `${resolved.name} (Packed)`

  const headerH = 48
  const hullHeaderH = 20
  const hullRowH = 22
  const sectionGap = 12
  const rowHeights = moduleGroups.map(rowHeightFor)
  const modulesHeight = rowHeights.reduce((a, b) => a + b, 0)
  const height =
    headerH +
    hullHeaderH +
    hullRows.length * hullRowH +
    sectionGap +
    modulesHeight +
    pad

  const chrome = panel({ width: w, height, borderColor: tierBorder(resolved.tier) })

  const icon = iconHex({
    x: pad,
    y: pad + 4,
    color: tokens.colors.text.accent,
    code: 'SH',
  })

  const name = text({
    x: pad + 34,
    y: pad + 22,
    value: displayName,
    size: tokens.typography.sizes.title,
    weight: 700,
    family: tokens.typography.display,
  })

  const badge = quantityBadge({ x: w - pad, y: pad, quantity })

  const hullHeader = text({
    x: pad,
    y: pad + headerH,
    value: 'HULL',
    size: tokens.typography.sizes.subtitle,
    weight: 700,
    color: tokens.colors.text.secondary,
    letterSpacing: 1,
  })

  let y = pad + headerH + 6
  let hullSvg = ''
  for (const row of hullRows) {
    hullSvg +=
      text({
        x: pad,
        y: y + 12,
        value: row.label,
        size: tokens.typography.sizes.body,
        color: tokens.colors.text.secondary,
      }) +
      text({
        x: w - pad,
        y: y + 12,
        value: formatNumber(row.value),
        size: tokens.typography.sizes.body,
        weight: 700,
        anchor: 'end',
      }) +
      divider({ x: pad, y: y + hullRowH - 4, width: innerW, color: tokens.colors.surface.panelBorderBright })
    y += hullRowH
  }

  y += sectionGap
  let modulesSvg = ''
  for (let i = 0; i < moduleGroups.length; i++) {
    const m = moduleGroups[i]!
    modulesSvg += moduleSlot({
      x: pad,
      y,
      width: innerW,
      installed: m.installed,
      capability: m.capability,
      description: m.description,
      accentColor: tokens.colors.brand.teal,
    })
    y += rowHeights[i]!
  }

  const inner = `${chrome}${icon}${name}${badge}${hullHeader}${hullSvg}${modulesSvg}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${inner}</svg>`
}
