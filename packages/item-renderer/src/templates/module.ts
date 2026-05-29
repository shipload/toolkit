import type {ResolvedItem} from '@shipload/sdk'
import {describeModuleForItem, formatLocation, renderDescription} from '@shipload/sdk'
import type {CargoItem} from '../payload/codec.ts'
import {panel} from '../primitives/panel.ts'
import {iconHex} from '../primitives/icon-hex.ts'
import {text} from '../primitives/text.ts'
import {quantityBadge} from '../primitives/quantity-badge.ts'
import {spanParagraph} from '../primitives/span-paragraph.ts'
import {tokens} from '../tokens/index.ts'
import {
    shortCode,
    formatMass,
    tierBorder,
    metaRowBlock,
    titleText,
    capabilityColor,
    BADGE_Y,
    HEADER_H,
    ICON_Y,
    META_BLOCK_GAP,
    CAP_HEADER_H,
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
    const desc = mode === 'values' ? describeModuleForItem(resolved) : undefined

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

    const capLabel = (group?.capability ?? capabilityName).toUpperCase()
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
    if (mode === 'values' && desc && group) {
        const spans = renderDescription(desc)
        const {svg: paraSvg, lineCount} = spanParagraph({
            x: pad,
            y: bodyYStart + 36,
            spans,
            charsPerLine: 36,
            lineHeight: 14,
            highlightColor: tokens.colors.text.primary,
        })
        bodyHeight = CAP_HEADER_H + lineCount * 14 + BODY_TAIL
        capSection = capHeader + paraSvg
    } else {
        bodyHeight = CAP_HEADER_H + BODY_TAIL
        capSection = capHeader
    }

    const height = bodyYStart + bodyHeight + pad

    const chrome = panel({width: w, height, borderColor: tierBorder(resolved.tier)})

    const badge = quantityBadge({x: w - pad, y: pad + BADGE_Y, quantity, tone: iconColor})

    const icon = iconHex({
        x: pad,
        y: pad + ICON_Y,
        color: iconColor,
        code: shortCode(resolved.itemId),
    })

    const name = titleText(pad + 34, pad + 22, resolved)

    const inner = `${chrome}${icon}${name}${badge}${metaSvg}${capSection}`

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${inner}</svg>`
}
