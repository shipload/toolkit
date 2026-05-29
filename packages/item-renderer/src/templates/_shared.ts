import type {ResolvedItem} from '@shipload/sdk'
import {baseName, formatMassScaled} from '@shipload/sdk'
import {text} from '../primitives/text.ts'
import {divider} from '../primitives/divider.ts'
import {tokens} from '../tokens/index.ts'

export function formatMass(kg: number): string {
    return formatMassScaled(kg)
}

export function tierBorder(tier: number): string {
    return tokens.colors.tier[tier] ?? tokens.colors.surface.panelBorder
}

export function shortCode(itemId: number): string {
    const str = itemId.toString(10)
    return str.slice(-2).padStart(2, '0')
}

export function capabilityColor(name: string): string {
    const key = name.toLowerCase().replace(/\s+/g, '') as keyof typeof tokens.colors.capability
    return tokens.colors.capability[key] ?? tokens.colors.accent.component
}

export const META_ROW_H = 22
export const HEADER_H = 48
export const ICON_Y = 4
export const BADGE_Y = 6
export const META_BLOCK_GAP = 16

export const STAT_ROW_H = 26
export const CAP_HEADER_H = 22
export const CAP_ROW_H = 18
export const BODY_TAIL = 8

// Gap from the meta block to the first stat row. Resources/components have no
// body sub-header, and statBar draws its label 6px above its y, so this is
// META_BLOCK_GAP plus the offset that puts the first stat label level with
// where module/entity body sections begin — keeping the meta→body gap uniform.
export const STAT_BLOCK_GAP = META_BLOCK_GAP + 22

// Uniform gap between a card's last body element and the bottom frame edge.
// Cards size their height to (last element bottom) + BOTTOM_PAD so trailing
// space is consistent across resource / component / module / entity types.
export const BOTTOM_PAD = 22

export function titleParts(x: number, y: number, name: string, tier: number): string {
    return text({
        x,
        y,
        value: name,
        size: tokens.typography.sizes.title,
        weight: 700,
        family: tokens.typography.display,
        spans: [
            {
                value: `T${tier}`,
                dx: 6,
                size: tokens.typography.sizes.subtitle,
                weight: 700,
                color: tokens.colors.text.secondary,
            },
        ],
    })
}

export function titleText(x: number, y: number, resolved: ResolvedItem): string {
    // Prominent base name; tier rendered as a smaller, muted inline suffix.
    return titleParts(x, y, baseName(resolved), resolved.tier)
}

export interface MetaRowProps {
    x: number
    y: number
    width: number
    label: string
    value: string
    showDivider?: boolean
}

export function metaRow({x, y, width, label, value, showDivider = true}: MetaRowProps): string {
    const labelText = text({
        x,
        y: y + 12,
        value: label,
        size: tokens.typography.sizes.body,
        color: tokens.colors.text.secondary,
    })
    const valueText = text({
        x: x + width,
        y: y + 12,
        value,
        size: tokens.typography.sizes.body,
        weight: 700,
        anchor: 'end',
    })
    const sep = showDivider
        ? divider({
              x,
              y: y + META_ROW_H - 4,
              width,
              color: tokens.colors.surface.panelBorderBright,
          })
        : ''
    return labelText + valueText + sep
}

export function metaRowBlock(
    x: number,
    yStart: number,
    width: number,
    rows: {label: string; value: string}[]
): {svg: string; height: number} {
    let svg = ''
    rows.forEach((row, i) => {
        svg += metaRow({
            x,
            y: yStart + i * META_ROW_H,
            width,
            ...row,
            showDivider: i < rows.length - 1,
        })
    })
    return {svg, height: rows.length * META_ROW_H}
}
