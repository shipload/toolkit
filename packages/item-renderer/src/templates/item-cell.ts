import type {ResolvedItem} from '@shipload/sdk'
import {tierColors} from '@shipload/sdk'
import {el} from '../primitives/svg.ts'
import {text} from '../primitives/text.ts'
import {componentIcon, componentIconSlugForName} from '../primitives/component-icon.ts'
import {entityIcon, entityIconSlugForName} from '../primitives/entity-icon.ts'
import {moduleIcon, moduleIconSlugForName} from '../primitives/module-icon.ts'
import {resourceIcon} from '../primitives/resource-icon.ts'
import {tokens} from '../tokens/index.ts'

export interface ItemCellProps {
    resolved: ResolvedItem
    quantity?: number
    size?: number
    quantityColor?: string
    quantityPrefix?: string
    iconImageHref?: string
}

export function abbreviateQuantity(n: number): string {
    const abs = Math.abs(n)
    if (abs < 1000) return String(n)
    const units = [
        {v: 1e9, s: 'b'},
        {v: 1e6, s: 'm'},
        {v: 1e3, s: 'k'},
    ]
    for (const u of units) {
        if (abs >= u.v) {
            return (n / u.v).toFixed(1).replace(/\.0$/, '') + u.s
        }
    }
    return String(n)
}

export interface ItemCellGroupProps extends ItemCellProps {
    x: number
    y: number
}

function cellInner(props: ItemCellProps): string {
    const size = props.size ?? 48
    const height = Math.round(size * 1.25)
    const r = Math.max(4, Math.round(size * 0.12))
    const cx = size / 2

    const border = el('rect', {
        x: 0.5,
        y: 0.5,
        width: size - 1,
        height: height - 1,
        rx: r,
        ry: r,
        fill: tokens.colors.surface.panel,
        stroke: tierColors[props.resolved.tier] ?? tokens.colors.surface.panelBorder,
        'stroke-width': 1.5,
    })

    const qty = props.quantity ?? 0
    const showQuantity = props.quantityPrefix ? qty >= 1 : qty > 1

    let content = ''
    const componentSlug =
        props.resolved.itemType === 'component'
            ? componentIconSlugForName(props.resolved.name)
            : null
    const entitySlug =
        props.resolved.itemType === 'entity' ? entityIconSlugForName(props.resolved.name) : null
    const moduleSlug =
        props.resolved.itemType === 'module' ? moduleIconSlugForName(props.resolved.name) : null

    if (props.iconImageHref) {
        const iconSize = Math.round(size * (showQuantity ? 0.72 : 0.9))
        const iconY = showQuantity ? Math.round(size * 0.08) : Math.round(height / 2 - iconSize / 2)
        content = el('image', {
            href: props.iconImageHref,
            x: (size - iconSize) / 2,
            y: iconY,
            width: iconSize,
            height: iconSize,
            preserveAspectRatio: 'xMidYMid meet',
        })
    } else if (componentSlug) {
        const iconSize = Math.round(size * (showQuantity ? 0.66 : 0.84))
        const iconY = showQuantity ? Math.round(size * 0.12) : Math.round(height / 2 - iconSize / 2)
        content = componentIcon(componentSlug, {
            x: (size - iconSize) / 2,
            y: iconY,
            size: iconSize,
        })
    } else if (entitySlug) {
        const iconSize = Math.round(size * (showQuantity ? 0.66 : 0.84))
        const iconY = showQuantity ? Math.round(size * 0.12) : Math.round(height / 2 - iconSize / 2)
        content = entityIcon(entitySlug, {
            x: (size - iconSize) / 2,
            y: iconY,
            size: iconSize,
        })
    } else if (moduleSlug) {
        const iconSize = Math.round(size * (showQuantity ? 0.66 : 0.84))
        const iconY = showQuantity ? Math.round(size * 0.12) : Math.round(height / 2 - iconSize / 2)
        content = moduleIcon(moduleSlug, {
            x: (size - iconSize) / 2,
            y: iconY,
            size: iconSize,
        })
    } else if (props.resolved.abbreviation) {
        content = showQuantity
            ? text({
                  x: cx,
                  y: size * 0.45,
                  value: props.resolved.abbreviation,
                  size: Math.round(size * 0.28),
                  weight: 700,
                  anchor: 'middle',
                  color: tokens.colors.text.primary,
                  family: tokens.typography.display,
              })
            : text({
                  x: cx,
                  y: height / 2,
                  value: props.resolved.abbreviation,
                  size: Math.round(size * 0.36),
                  weight: 700,
                  anchor: 'middle',
                  dominantBaseline: 'central',
                  color: tokens.colors.text.primary,
                  family: tokens.typography.display,
              })
    } else if (props.resolved.category) {
        const iconSize = Math.round(size * (showQuantity ? 0.66 : 0.84))
        const iconY = showQuantity ? Math.round(size * 0.12) : Math.round(height / 2 - iconSize / 2)
        content = resourceIcon(props.resolved.category, {
            x: (size - iconSize) / 2,
            y: iconY,
            size: iconSize,
        })
    } else if (props.resolved.icon) {
        content = text({
            x: cx,
            y: showQuantity ? size * 0.4 : height / 2,
            value: props.resolved.icon,
            size: Math.round(size * (showQuantity ? 0.44 : 0.56)),
            weight: 400,
            anchor: 'middle',
            dominantBaseline: 'central',
            color: tokens.colors.text.primary,
        })
    }

    let quantityText = ''
    if (showQuantity) {
        const label = (props.quantityPrefix ?? '') + abbreviateQuantity(qty)
        const fontSize = Math.max(8, Math.round(size * 0.2))
        const charW = fontSize * 0.6
        const padX = Math.max(2, Math.round(fontSize * 0.34))
        const padY = Math.max(1, Math.round(fontSize * 0.18))
        const margin = Math.max(2, Math.round(size * 0.06))
        const plateW = Math.round(label.length * charW) + padX * 2
        const plateH = fontSize + padY * 2
        const plateRight = size - margin
        const plateBottom = height - margin
        const plate = el('rect', {
            x: plateRight - plateW,
            y: plateBottom - plateH,
            width: plateW,
            height: plateH,
            rx: Math.round(plateH / 2),
            ry: Math.round(plateH / 2),
            fill: '#050c24',
            'fill-opacity': 0.82,
        })
        quantityText =
            plate +
            text({
                x: plateRight - padX,
                y: plateBottom - plateH / 2,
                value: label,
                size: fontSize,
                weight: 700,
                anchor: 'end',
                dominantBaseline: 'central',
                color: props.quantityColor ?? tokens.colors.text.primary,
                family: tokens.typography.mono,
            })
    }

    return border + content + quantityText
}

export function itemCellGroup(props: ItemCellGroupProps): string {
    return `<g transform="translate(${props.x}, ${props.y})">${cellInner(props)}</g>`
}

export function renderItemCell(props: ItemCellProps): string {
    const size = props.size ?? 48
    const height = Math.round(size * 1.25)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}">${cellInner(props)}</svg>`
}
