import type {TextSpan} from '@shipload/sdk'
import {formatLocation, formatMassScaled} from '@shipload/sdk'
import {panel} from '../primitives/panel.ts'
import {iconHex} from '../primitives/icon-hex.ts'
import {text} from '../primitives/text.ts'
import {moduleSlot} from '../primitives/module-slot.ts'
import {quantityBadge} from '../primitives/quantity-badge.ts'
import {wrapText} from '../primitives/wrap.ts'
import {tokens} from '../tokens/index.ts'
import {tierBorder, metaRowBlock, BADGE_Y, HEADER_H, ICON_Y} from './_shared.ts'

const HULL_MASS_LABELS = new Set(['mass', 'capacity'])

export interface ShipPanelSlot {
    name?: string
    installed: boolean
    description?: string | TextSpan[]
}

export interface ShipPanelProps {
    name: string
    tier: number
    quantity?: number
    location?: {x: number; y: number}
    attributes: {capability: string; attributes: {label: string; value: number}[]}[]
    slots: ShipPanelSlot[]
}

function formatHullValue(label: string, value: number): string {
    return HULL_MASS_LABELS.has(label.toLowerCase())
        ? formatMassScaled(value)
        : value.toLocaleString('en-US')
}

const MODULE_LABEL_PREFIX = (capability: string) => `${capability}: `

function rowHeightFor(slot: ShipPanelSlot): number {
    if (!slot.installed) return 24
    const desc = slot.description
    const plain =
        typeof desc === 'string'
            ? desc
            : Array.isArray(desc)
              ? desc.map((s) => s.text).join('')
              : ''
    if (plain.length === 0) return 24
    const combined = MODULE_LABEL_PREFIX(slot.name ?? 'Module') + plain
    const lineCount = Math.max(1, wrapText({value: combined, charsPerLine: 36}).length)
    return 10 + lineCount * 14
}

export function renderShipPanel(props: ShipPanelProps): string {
    const w = tokens.spacing.panelWidth
    const pad = tokens.spacing.panelPadding
    const innerW = w - pad * 2
    const quantity = props.quantity ?? 0

    const hullGroup = props.attributes?.find((g) => g.capability.toLowerCase() === 'hull')
    const hullAttrs = (hullGroup?.attributes ?? []).map((a) => ({
        label: a.label,
        value: formatHullValue(a.label, a.value),
    }))
    const metaRows = props.location
        ? [{label: 'Location', value: formatLocation(props.location)}, ...hullAttrs]
        : hullAttrs

    const sectionGap = 12

    const metaYStart = pad + HEADER_H
    const {svg: metaSvg, height: metaH} = metaRowBlock(pad, metaYStart, innerW, metaRows)

    const rowHeights = props.slots.map(rowHeightFor)
    const modulesHeight = rowHeights.reduce((a, b) => a + b, 0)
    const height = metaYStart + metaH + sectionGap + modulesHeight + pad

    const chrome = panel({width: w, height, borderColor: tierBorder(props.tier)})

    const icon = iconHex({
        x: pad,
        y: pad + ICON_Y,
        color: tokens.colors.text.accent,
        code: 'SH',
    })

    const name = text({
        x: pad + 34,
        y: pad + 22,
        value: props.name,
        size: tokens.typography.sizes.title,
        weight: 700,
        family: tokens.typography.display,
    })

    const badge = quantityBadge({x: w - pad, y: pad + BADGE_Y, quantity})

    let y = metaYStart + metaH + sectionGap
    let modulesSvg = ''
    for (let i = 0; i < props.slots.length; i++) {
        const slot = props.slots[i]!
        modulesSvg += moduleSlot({
            x: pad,
            y,
            width: innerW,
            installed: slot.installed,
            capability: slot.name,
            description: slot.description,
            accentColor: tokens.colors.brand.teal,
        })
        y += rowHeights[i]!
    }

    const inner = `${chrome}${icon}${name}${badge}${metaSvg}${modulesSvg}`
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${inner}</svg>`
}
