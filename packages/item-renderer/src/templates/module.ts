import type {ResolvedItem} from '@shipload/sdk'
import {formatLocation, getModuleFigures} from '@shipload/sdk'
import type {CargoItem} from '../payload/codec.ts'
import {panel} from '../primitives/panel.ts'
import {iconHex} from '../primitives/icon-hex.ts'
import {moduleIcon, moduleIconSlugForName} from '../primitives/module-icon.ts'
import {text} from '../primitives/text.ts'
import {quantityBadge} from '../primitives/quantity-badge.ts'
import {figureRows} from '../primitives/figure-rows.ts'
import {tokens} from '../tokens/index.ts'
import {
    shortCode,
    formatMass,
    tierBorder,
    metaRowBlock,
    titleText,
    capabilityColor,
    figureRowsFor,
    BADGE_Y,
    HEADER_H,
    ICON_Y,
    META_BLOCK_GAP,
    CAP_HEADER_H,
    CAP_ROW_H,
    BODY_TAIL,
} from './_shared.ts'

export interface RenderModuleOpts {
    mode?: 'values' | 'ranges'
    location?: {x: number; y: number}
}

export function renderModule(
    item: CargoItem,
    resolved: ResolvedItem,
    opts?: RenderModuleOpts
): string {
    const mode = opts?.mode ?? 'values'
    const w = tokens.spacing.panelWidth
    const pad = tokens.spacing.panelPadding
    const innerW = w - pad * 2

    const group = resolved.attributes?.[0]
    const figures = getModuleFigures(resolved.itemId, mode === 'values' ? item.stats : 0n)

    const capabilityName = group?.capability ?? resolved.name.replace(/\s+T\d+$/i, '')

    const quantity = Number(BigInt(item.quantity.toString()))
    const metaRows = [
        {label: 'Mass', value: formatMass(resolved.mass * Math.max(quantity, 1))},
        ...(opts?.location ? [{label: 'Location', value: formatLocation(opts.location)}] : []),
    ]

    const metaYStart = pad + HEADER_H
    const {svg: metaSvg, height: metaH} = metaRowBlock(pad, metaYStart, innerW, metaRows)
    const bodyYStart = metaYStart + metaH + META_BLOCK_GAP

    const iconColor = group ? capabilityColor(group.capability) : capabilityColor(capabilityName)

    const capLabel = (figures?.sectionLabel ?? capabilityName).toUpperCase()
    const capHeader = text({
        x: pad,
        y: bodyYStart + 16,
        value: capLabel,
        size: tokens.typography.sizes.subtitle,
        weight: 700,
        family: tokens.typography.sans,
        color: iconColor,
        letterSpacing: 1,
    })

    let bodyHeight: number
    let capSection: string
    const rows = mode === 'values' ? figureRowsFor(figures) : []
    if (rows.length > 0) {
        const {svg: rowsSvg, height: rowsH} = figureRows({
            x: pad,
            y: bodyYStart + 36,
            width: innerW,
            rows,
            size: tokens.typography.sizes.body,
            rowHeight: CAP_ROW_H,
            lineHeight: 14,
            charsPerLine: 36,
        })
        bodyHeight = CAP_HEADER_H + 14 + rowsH + BODY_TAIL
        capSection = capHeader + rowsSvg
    } else {
        bodyHeight = CAP_HEADER_H + BODY_TAIL
        capSection = capHeader
    }

    const height = bodyYStart + bodyHeight + pad

    const chrome = panel({width: w, height, borderColor: tierBorder(resolved.tier)})

    const badge = quantityBadge({x: w - pad, y: pad + BADGE_Y, quantity, tone: iconColor})

    const moduleSlug = moduleIconSlugForName(resolved.name)
    const icon = moduleSlug
        ? moduleIcon(moduleSlug, {x: pad, y: pad + ICON_Y - 2, size: 28})
        : iconHex({
              x: pad,
              y: pad + ICON_Y,
              color: iconColor,
              code: shortCode(resolved.itemId),
          })

    const name = titleText(pad + 34, pad + 22, resolved)

    const inner = `${chrome}${icon}${name}${badge}${metaSvg}${capSection}`

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${inner}</svg>`
}
