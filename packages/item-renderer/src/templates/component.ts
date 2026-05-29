import type {ResolvedItem} from '@shipload/sdk'
import {getRecipe, getStatDefinitions, resolveItemCategory, formatLocation} from '@shipload/sdk'
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

export interface RenderComponentOpts {
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

export function renderComponent(
    item: CargoItem,
    resolved: ResolvedItem,
    opts?: RenderComponentOpts
): string {
    const mode = opts?.mode ?? 'values'
    const w = tokens.spacing.panelWidth
    const pad = tokens.spacing.panelPadding
    const innerW = w - pad * 2

    const identity = tokens.colors.accent.component

    let rows: StatRow[]
    if (mode === 'values') {
        rows = (resolved.stats ?? []).map((s) => ({
            label: s.label,
            abbreviation: s.abbreviation,
            value: s.value,
            color: identity,
            inverted: s.inverted,
        }))
    } else {
        const recipe = getRecipe(resolved.itemId)
        rows = (recipe?.statSlots ?? []).flatMap((slot) => {
            const src = slot.sources[0]
            if (!src) return []
            const input = recipe!.inputs[src.inputIndex]
            if (!input) return []
            const category = resolveItemCategory(input.itemId)
            if (!category) return []
            const def = getStatDefinitions(category)[src.statIndex]
            if (!def) return []
            return [
                {
                    label: def.label,
                    abbreviation: def.abbreviation,
                    value: null,
                    color: identity,
                    inverted: def.inverted,
                },
            ]
        })
    }

    const quantity = Number(BigInt(item.quantity.toString()))
    const metaRows = [
        {label: 'Mass', value: formatMass(resolved.mass * Math.max(quantity, 1))},
        ...(opts?.location ? [{label: 'Location', value: formatLocation(opts.location)}] : []),
    ]

    const metaYStart = pad + HEADER_H
    const {svg: metaSvg, height: metaH} = metaRowBlock(pad, metaYStart, innerW, metaRows)
    const statsYStart = metaYStart + metaH + STAT_BLOCK_GAP
    const statsBottom =
        statsYStart + Math.max(0, rows.length - 1) * STAT_ROW_H + tokens.spacing.statBarHeight
    const height = statsBottom + BOTTOM_PAD

    const chrome = panel({width: w, height, borderColor: tierBorder(resolved.tier)})

    const badge = quantityBadge({x: w - pad, y: pad + BADGE_Y, quantity, tone: identity})

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
