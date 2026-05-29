import type {ResolvedItem} from '@shipload/sdk'
import {describeModuleForItem, displayName, formatLocation, renderDescription} from '@shipload/sdk'
import type {CargoItem} from '../payload/codec.ts'
import {panel} from '../primitives/panel.ts'
import {iconHex} from '../primitives/icon-hex.ts'
import {text} from '../primitives/text.ts'
import {compactRow} from '../primitives/compact-row.ts'
import {quantityBadge} from '../primitives/quantity-badge.ts'
import {spanParagraph} from '../primitives/span-paragraph.ts'
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

function capabilityColor(name: string): string {
    const key = name.toLowerCase().replace(/\s+/g, '') as keyof typeof tokens.colors.capability
    return tokens.colors.capability[key] ?? tokens.colors.accent.component
}

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
    const attrs = group?.attributes ?? []
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

    let bodyHeight = 0
    if (mode === 'ranges') {
        bodyHeight = 20 + 8
    } else if (desc && group) {
        const plain = renderDescription(desc)
            .map((s) => s.text)
            .join('')
        const lines = plain.split(/\s+/).reduce(
            (acc, word) => {
                const last = acc[acc.length - 1] ?? ''
                if (last.length === 0) return [...acc.slice(0, -1), word]
                if (last.length + 1 + word.length <= 36)
                    return [...acc.slice(0, -1), `${last} ${word}`]
                return [...acc, word]
            },
            ['']
        )
        const lineCount = lines.filter((l) => l.length > 0).length
        bodyHeight = 20 + lineCount * 14 + 8
    } else if (group && attrs.length > 0) {
        const capHeaderH = 22
        const attrsH = attrs.length * 18
        bodyHeight = capHeaderH + attrsH + 8
    }

    const height = bodyYStart + bodyHeight + pad

    const chrome = panel({width: w, height, borderColor: tierBorder(resolved.tier)})

    const badge = quantityBadge({x: w - pad, y: pad + BADGE_Y, quantity})

    const iconColor = group ? capabilityColor(group.capability) : capabilityColor(capabilityName)
    const icon = iconHex({
        x: pad,
        y: pad + ICON_Y,
        color: iconColor,
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

    let capSection = ''
    if (mode === 'ranges') {
        const accentColor = capabilityColor(capabilityName)
        capSection = text({
            x: pad,
            y: bodyYStart + 16,
            value: capabilityName.toUpperCase(),
            size: tokens.typography.sizes.subtitle,
            weight: 700,
            family: tokens.typography.sans,
            color: accentColor,
            letterSpacing: 1,
        })
    } else if (desc && group) {
        const accentColor = capabilityColor(group.capability)
        const capHeader = text({
            x: pad,
            y: bodyYStart + 16,
            value: group.capability.toUpperCase(),
            size: tokens.typography.sizes.subtitle,
            weight: 700,
            family: tokens.typography.sans,
            color: accentColor,
            letterSpacing: 1,
        })
        const spans = renderDescription(desc)
        const {svg: paraSvg} = spanParagraph({
            x: pad,
            y: bodyYStart + 36,
            spans,
            charsPerLine: 36,
            lineHeight: 14,
        })
        capSection = capHeader + paraSvg
    } else if (group && attrs.length > 0) {
        const capY = bodyYStart + 22
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

    const inner = `${chrome}${icon}${name}${badge}${metaSvg}${capSection}`

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${inner}</svg>`
}
