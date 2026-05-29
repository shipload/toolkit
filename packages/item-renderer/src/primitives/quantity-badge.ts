import {el} from './svg.ts'
import {text} from './text.ts'
import {tokens} from '../tokens/index.ts'

export interface QuantityBadgeProps {
    x: number
    y: number
    quantity: number
    label?: string
    tone: string
}

export function quantityBadge({
    x,
    y,
    quantity,
    label: labelOverride,
    tone,
}: QuantityBadgeProps): string {
    if (quantity <= 0) return ''
    const label = labelOverride ?? `×${quantity}`
    const w = label.length * 7 + 12
    const h = tokens.spacing.quantityBadgeHeight
    return (
        el('rect', {
            x: x - w,
            y,
            width: w,
            height: h,
            rx: h / 2,
            ry: h / 2,
            fill: tokens.colors.surface.panel,
            stroke: tone,
            'stroke-width': 1.5,
        }) +
        text({
            x: x - w / 2,
            y: y + h / 2 + 4,
            value: label,
            size: tokens.typography.sizes.label,
            weight: 700,
            family: tokens.typography.mono,
            color: tokens.colors.text.primary,
            anchor: 'middle',
        })
    )
}
