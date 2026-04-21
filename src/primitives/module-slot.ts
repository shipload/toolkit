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
  const label = `${props.capability ?? 'Module'}: `

  const desc = props.description
  const isEmpty =
    !desc ||
    (typeof desc === 'string' && desc.length === 0) ||
    (Array.isArray(desc) && desc.length === 0)

  if (isEmpty) {
    return (
      FILLED_DIAMOND(iconX, iconY, accent) +
      text({
        x: textX,
        y: iconY + 3,
        value: label.trimEnd(),
        size: tokens.typography.sizes.body,
        weight: 600,
        color: tokens.colors.text.primary,
      })
    )
  }

  const descSpans: TextSpan[] = typeof desc === 'string' ? [{ text: desc }] : desc
  const descPlain = descSpans.map((s) => s.text).join('')
  const combined = label + descPlain
  const lines = wrapText({ value: combined, charsPerLine: 36 })

  const highlightColor = tokens.colors.text.accent
  const bodyColor = tokens.colors.text.secondary
  const labelColor = tokens.colors.text.primary
  const size = tokens.typography.sizes.body
  const fontFamily = escapeXml(tokens.typography.sans)
  const labelEnd = label.length

  let offset = 0
  const textBlocks = lines
    .map((line, i) => {
      const lineStart = combined.indexOf(line, offset)
      const lineEnd = lineStart + line.length
      offset = lineEnd
      const y = iconY + 3 + i * 14

      const tspans: string[] = []

      if (lineStart < labelEnd) {
        const labelSliceEnd = Math.min(lineEnd, labelEnd)
        const labelText = combined.slice(lineStart, labelSliceEnd)
        if (labelText.length > 0) {
          tspans.push(
            `<tspan font-weight="600" fill="${labelColor}">${escapeXml(labelText)}</tspan>`,
          )
        }
        if (lineEnd > labelEnd) {
          const descSlice = sliceSpans(descSpans, 0, lineEnd - labelEnd)
          for (const s of descSlice) {
            const fill = s.highlight ? highlightColor : bodyColor
            tspans.push(`<tspan fill="${fill}">${escapeXml(s.text)}</tspan>`)
          }
        }
      } else {
        const descSlice = sliceSpans(descSpans, lineStart - labelEnd, lineEnd - labelEnd)
        for (const s of descSlice) {
          const fill = s.highlight ? highlightColor : bodyColor
          tspans.push(`<tspan fill="${fill}">${escapeXml(s.text)}</tspan>`)
        }
      }

      return `<text x="${textX}" y="${y}" font-family="${fontFamily}" font-size="${size}">${tspans.join('')}</text>`
    })
    .join('')

  return FILLED_DIAMOND(iconX, iconY, accent) + textBlocks
}
