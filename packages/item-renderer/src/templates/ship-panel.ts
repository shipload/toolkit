import type {TextSpan} from '@shipload/sdk'
import {formatLocation, formatMassScaled} from '@shipload/sdk'
import {panel} from '../primitives/panel.ts'
import {iconHex} from '../primitives/icon-hex.ts'
import {entityIcon, entityIconSlugForName} from '../primitives/entity-icon.ts'
import {moduleSlot} from '../primitives/module-slot.ts'
import {quantityBadge} from '../primitives/quantity-badge.ts'
import {wrapText} from '../primitives/wrap.ts'
import {tokens} from '../tokens/index.ts'
import {
    tierBorder,
    metaRowBlock,
    titleParts,
    capabilityColor,
    BADGE_Y,
    HEADER_H,
    ICON_Y,
    BOTTOM_PAD,
} from './_shared.ts'

const HULL_MASS_LABELS = new Set(['mass', 'capacity'])

const ENTITY_COLOR = tokens.colors.brand.cyan

export interface ShipPanelSlot {
    name?: string
    installed: boolean
    capability?: string
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

function fallbackEntityCode(name: string): string {
    const words = name
        .replace(/\s+T\d+\s*$/i, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
    if (words.length >= 2)
        return words
            .map((word) => word[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
    return (words[0] ?? 'EN').slice(0, 2).toUpperCase().padEnd(2, 'N')
}

function lineCountFor(slot: ShipPanelSlot): number {
    const desc = slot.description
    const plain =
        typeof desc === 'string'
            ? desc
            : Array.isArray(desc)
              ? desc.map((s) => s.text).join('')
              : ''
    if (plain.length === 0) return 0
    const combined = MODULE_LABEL_PREFIX(slot.capability ?? slot.name ?? 'Module') + plain
    return Math.max(1, wrapText({value: combined, charsPerLine: 36}).length)
}

function rowHeightFor(slot: ShipPanelSlot): number {
    if (!slot.installed) return 24
    const lineCount = lineCountFor(slot)
    if (lineCount === 0) return 24
    return 10 + lineCount * 14
}

function contentBottomOffsetFor(slot: ShipPanelSlot): number {
    if (!slot.installed) return 14
    const lineCount = lineCountFor(slot)
    if (lineCount === 0) return 14
    return 9 + (lineCount - 1) * 14 + 5
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

    const slotsYStart = metaYStart + metaH + sectionGap

    let y = slotsYStart
    let modulesSvg = ''
    let lastContentBottom = slotsYStart
    props.slots.forEach((slot, i) => {
        const accentColor = slot.installed
            ? capabilityColor(slot.capability ?? slot.name ?? 'Module')
            : ENTITY_COLOR
        modulesSvg += moduleSlot({
            x: pad,
            y,
            width: innerW,
            installed: slot.installed,
            capability: slot.capability ?? slot.name,
            description: slot.description,
            accentColor,
        })
        lastContentBottom = y + contentBottomOffsetFor(slot)
        if (i < props.slots.length - 1) y += rowHeightFor(slot)
    })

    const height = lastContentBottom + BOTTOM_PAD

    const chrome = panel({width: w, height, borderColor: tierBorder(props.tier)})

    const entitySlug = entityIconSlugForName(props.name)
    const icon = entitySlug
        ? entityIcon(entitySlug, {x: pad, y: pad + ICON_Y - 2, size: 28})
        : iconHex({
              x: pad,
              y: pad + ICON_Y,
              color: ENTITY_COLOR,
              code: fallbackEntityCode(props.name),
          })

    const name = titleParts(pad + 34, pad + 22, props.name, props.tier)

    const badge = quantityBadge({
        x: w - pad,
        y: pad + BADGE_Y,
        quantity,
        tone: ENTITY_COLOR,
    })

    const inner = `${chrome}${icon}${name}${badge}${metaSvg}${modulesSvg}`
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${inner}</svg>`
}
