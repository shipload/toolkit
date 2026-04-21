import { el } from './svg.ts'
import { text } from './text.ts'
import { wrapText } from './wrap.ts'
import { tokens } from '../tokens/index.ts'
import type { TextSpan } from '@shipload/sdk'

export interface ModuleSlotProps {
  x: number
  y: number
  width: number
  installed: boolean
  capability?: string
  description?: string | TextSpan[]
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

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sliceSpans(spans: TextSpan[], start: number, end: number): TextSpan[] {
  const out: TextSpan[] = []
  let cursor = 0
  for (const span of spans) {
    const spanStart = cursor
    const spanEnd = cursor + span.text.length
    cursor = spanEnd
    if (spanEnd <= start || spanStart >= end) continue
    const sliceStart = Math.max(0, start - spanStart)
    const sliceEnd = span.text.length - Math.max(0, spanEnd - end)
    const txt = span.text.slice(sliceStart, sliceEnd)
    if (txt.length === 0) continue
    out.push(span.highlight ? { text: txt, highlight: true } : { text: txt })
  }
  return out
}

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

  const desc = props.description
  const isEmpty =
    !desc ||
    (typeof desc === 'string' && desc.length === 0) ||
    (Array.isArray(desc) && desc.length === 0)
  if (isEmpty) return headline

  if (typeof desc === 'string') {
    const descLines = wrapText({ value: desc, charsPerLine: 36 })
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

  const spans: TextSpan[] = desc
  const plain = spans.map((s) => s.text).join('')
  const lines = wrapText({ value: plain, charsPerLine: 36 })
  const highlightColor = tokens.colors.text.accent
  const bodyColor = tokens.colors.text.secondary
  const size = tokens.typography.sizes.body

  let offset = 0
  const descOut = lines
    .map((line, i) => {
      const lineStart = plain.indexOf(line, offset)
      const lineEnd = lineStart + line.length
      offset = lineEnd
      const lineSpans = sliceSpans(spans, lineStart, lineEnd)
      const y = iconY + 20 + i * 14
      const tspans = lineSpans
        .map((s) => {
          const fill = s.highlight ? highlightColor : bodyColor
          return `<tspan fill="${fill}">${escapeXml(s.text)}</tspan>`
        })
        .join('')
      return `<text x="${textX}" y="${y}" font-family="${tokens.typography.sans}" font-size="${size}">${tspans}</text>`
    })
    .join('')

  return headline + descOut
}
