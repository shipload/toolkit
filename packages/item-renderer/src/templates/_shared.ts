import {formatMassScaled} from '@shipload/sdk'
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

export const META_ROW_H = 22
export const HEADER_H = 48
export const ICON_Y = 4
export const BADGE_Y = 6
export const META_BLOCK_GAP = 16

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
