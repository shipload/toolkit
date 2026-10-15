import {el} from './svg.ts'
import {text} from './text.ts'
import {figureRows, type FigureRow} from './figure-rows.ts'
import {tokens} from '../tokens/index.ts'

export interface ModuleSlotProps {
    x: number
    y: number
    width: number
    installed: boolean
    name?: string
    rows?: FigureRow[]
    accentColor?: string
}

export const SLOT_LINE_H = 14
export const SLOT_CHARS_PER_LINE = 36

const EMPTY_DIAMOND = (cx: number, cy: number, color: string) =>
    el('polygon', {
        points: `${cx},${cy - 5} ${cx + 5},${cy} ${cx},${cy + 5} ${cx - 5},${cy}`,
        fill: 'none',
        stroke: color,
        'stroke-width': 1,
    })

const FILLED_DIAMOND = (cx: number, cy: number, color: string) =>
    el('polygon', {
        points: `${cx},${cy - 5} ${cx + 5},${cy} ${cx},${cy + 5} ${cx - 5},${cy}`,
        fill: color,
    })

export function moduleSlot(props: ModuleSlotProps): string {
    const iconX = props.x + 6
    const iconY = props.y + 6
    const textX = props.x + 20

    if (!props.installed) {
        return (
            EMPTY_DIAMOND(iconX, iconY, tokens.colors.surface.panelBorderBright) +
            text({
                x: textX,
                y: iconY + 3,
                value: 'Empty module',
                size: tokens.typography.sizes.body,
                color: tokens.colors.text.muted,
            })
        )
    }

    const accent = props.accentColor ?? tokens.colors.accent.component
    const heading = text({
        x: textX,
        y: iconY + 3,
        value: props.name ?? 'Module',
        size: tokens.typography.sizes.body,
        weight: 600,
        color: accent,
    })
    const {svg: rowsSvg} = figureRows({
        x: textX,
        y: iconY + 3 + SLOT_LINE_H,
        width: props.x + props.width - textX,
        rows: props.rows ?? [],
        size: tokens.typography.sizes.subtitle,
        rowHeight: SLOT_LINE_H,
        lineHeight: SLOT_LINE_H,
        charsPerLine: SLOT_CHARS_PER_LINE,
    })
    return FILLED_DIAMOND(iconX, iconY, accent) + heading + rowsSvg
}
