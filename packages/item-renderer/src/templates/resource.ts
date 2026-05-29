import type {ResolvedItem} from '@shipload/sdk'
import {getStatDefinitions, categoryColors, formatLocation} from '@shipload/sdk'
import type {CargoItem} from '../payload/codec.ts'
import {panel} from '../primitives/panel.ts'
import {iconHex} from '../primitives/icon-hex.ts'
import {statBar} from '../primitives/stat-bar.ts'
import {quantityBadge} from '../primitives/quantity-badge.ts'
import {tokens} from '../tokens/index.ts'
import {
    shortCode,
    formatMass,
    tierBorder,
    metaRowBlock,
    titleText,
    BADGE_Y,
    HEADER_H,
    ICON_Y,
    STAT_BLOCK_GAP,
    STAT_ROW_H,
    BOTTOM_PAD,
} from './_shared.ts'

function categoryColor(category?: string): string {
    if (!category) return tokens.colors.text.muted
    const key = category as keyof typeof tokens.colors.category
    return tokens.colors.category[key] ?? tokens.colors.text.muted
}

export interface RenderResourceOpts {
    mode?: 'values' | 'ranges'
    location?: {x: number; y: number}
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
    opts?: RenderResourceOpts
): string {
    const mode = opts?.mode ?? 'values'
    const w = tokens.spacing.panelWidth
    const pad = tokens.spacing.panelPadding
    const innerW = w - pad * 2

    let rows: StatRow[]
    if (mode === 'values') {
        rows = (resolved.stats ?? []).map((s) => ({
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
        rows = defs.map((d) => ({
            label: d.label,
            abbreviation: d.abbreviation,
            value: null,
            color,
            inverted: d.inverted,
        }))
    }

    const metaRows = [
        ...(opts?.location ? [{label: 'Location', value: formatLocation(opts.location)}] : []),
    ]

    const metaYStart = pad + HEADER_H
    const {svg: metaSvg, height: metaH} = metaRowBlock(pad, metaYStart, innerW, metaRows)
    const statsYStart = metaYStart + metaH + STAT_BLOCK_GAP
    const statsBottom =
        statsYStart + Math.max(0, rows.length - 1) * STAT_ROW_H + tokens.spacing.statBarHeight
    const height = statsBottom + BOTTOM_PAD

    const chrome = panel({width: w, height, borderColor: tierBorder(resolved.tier)})

    const identity = categoryColor(resolved.category)

    const quantity = Number(BigInt(item.quantity.toString()))
    const badge = quantityBadge({
        x: w - pad,
        y: pad + BADGE_Y,
        quantity,
        label: formatMass(quantity * resolved.mass),
        tone: identity,
    })

    const icon = iconHex({
        x: pad,
        y: pad + ICON_Y,
        color: identity,
        code: shortCode(resolved.itemId),
    })

    const name = titleText(pad + 34, pad + 22, resolved)

    const statsSvg = rows
        .map((row, i) =>
            statBar({
                x: pad,
                y: statsYStart + i * STAT_ROW_H,
                width: innerW,
                label: row.label,
                abbreviation: row.abbreviation,
                value: row.value,
                color: row.color,
                inverted: row.inverted,
            })
        )
        .join('')

    const inner = `${chrome}${icon}${name}${badge}${metaSvg}${statsSvg}`

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${inner}</svg>`
}
