import type {ResolvedItem} from '@shipload/sdk'
import {
    formatTier,
    getRecipe,
    getStatDefinitions,
    resolveItemCategory,
    categoryColors,
    displayName,
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
                    color: categoryColors[category],
                    inverted: def.inverted,
                },
            ]
        })
    }

    const quantity = Number(BigInt(item.quantity.toString()))
    const metaRows = [
        {label: 'Type', value: `COMPONENT · ${formatTier(resolved.tier)}`},
        {label: 'Mass', value: formatMass(resolved.mass * Math.max(quantity, 1))},
        ...(opts?.location ? [{label: 'Location', value: formatLocation(opts.location)}] : []),
    ]

    const metaYStart = pad + HEADER_H
    const {svg: metaSvg, height: metaH} = metaRowBlock(pad, metaYStart, innerW, metaRows)
    const statsYStart = metaYStart + metaH + META_BLOCK_GAP
    const statsH = rows.length * 26 + 8
    const height = statsYStart + statsH + pad

    const chrome = panel({width: w, height, borderColor: tierBorder(resolved.tier)})

    const badge = quantityBadge({x: w - pad, y: pad + BADGE_Y, quantity})

    const icon = iconHex({
        x: pad,
        y: pad + ICON_Y,
        color: tokens.colors.accent.component,
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
