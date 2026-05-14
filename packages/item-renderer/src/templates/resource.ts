import type {ResolvedItem} from '@shipload/sdk'
import {
    getStatDefinitions,
    categoryColors,
    displayNameWithTier,
    formatLocation,
} from '@shipload/sdk'
import type {CargoItem} from '../payload/codec.ts'
import {panel} from '../primitives/panel.ts'
import {iconHex} from '../primitives/icon-hex.ts'
import {text} from '../primitives/text.ts'
import {statBar} from '../primitives/stat-bar.ts'
import {quantityBadge} from '../primitives/quantity-badge.ts'
import {tokens} from '../tokens/index.ts'
import {
    shortCode,
    formatMass,
    tierBorder,
    metaRowBlock,
    BADGE_Y,
    HEADER_H,
    ICON_Y,
    META_BLOCK_GAP,
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
        {label: 'Mass', value: formatMass(resolved.mass)},
        ...(opts?.location ? [{label: 'Location', value: formatLocation(opts.location)}] : []),
    ]

    const metaYStart = pad + HEADER_H
    const {svg: metaSvg, height: metaH} = metaRowBlock(pad, metaYStart, innerW, metaRows)
    const statsYStart = metaYStart + metaH + META_BLOCK_GAP
    const statsH = rows.length * 26 + 8
    const height = statsYStart + statsH + pad

    const chrome = panel({width: w, height, borderColor: tierBorder(resolved.tier)})

    const quantity = Number(BigInt(item.quantity.toString()))
    const badge = quantityBadge({x: w - pad, y: pad + BADGE_Y, quantity})

    const icon = iconHex({
        x: pad,
        y: pad + ICON_Y,
        color: categoryColor(resolved.category),
        code: shortCode(resolved.itemId),
    })

    const name = text({
        x: pad + 34,
        y: pad + 22,
        value: displayNameWithTier(resolved),
        size: tokens.typography.sizes.title,
        weight: 700,
        family: tokens.typography.display,
    })

    const statsSvg = rows
        .map((row, i) =>
            statBar({
                x: pad,
                y: statsYStart + i * 26,
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
