import { el } from './svg.ts'
import { text } from './text.ts'
import { wrapText } from './wrap.ts'
import { tokens } from '../tokens/index.ts'

export interface ModuleSlotProps {
  x: number
  y: number
  width: number
  installed: boolean
  capability?: string
  description?: string
  accentColor?: string
}

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

  const accent = props.accentColor ?? tokens.colors.text.accent
  const headline =
    FILLED_DIAMOND(iconX, iconY, accent) +
    text({
      x: textX,
      y: iconY + 3,
      value: `${props.capability ?? 'Module'}:`,
      size: tokens.typography.sizes.body,
      weight: 600,
      color: tokens.colors.text.primary,
    })

  const descLines = props.description
    ? wrapText({ value: props.description, charsPerLine: 36 })
    : []
  const descOut = descLines
    .map((line, i) =>
      text({
        x: textX,
        y: iconY + 20 + i * 14,
        value: line,
        size: tokens.typography.sizes.body,
        color: tokens.colors.text.secondary,
      }),
    )
    .join('')

  return headline + descOut
}
