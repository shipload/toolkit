import {wrapText} from './wrap.ts'
import {escapeXml as escapeAttr} from './svg.ts'
import {tokens} from '../tokens/index.ts'
import type {TextSpan} from '@shipload/sdk'

export interface SpanParagraphProps {
    x: number
    y: number
    spans: TextSpan[]
    charsPerLine?: number
    lineHeight?: number
    bodyColor?: string
    highlightColor?: string
    fontSize?: number
}

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
        out.push(span.highlight ? {text: txt, highlight: true} : {text: txt})
    }
    return out
}

export function spanParagraph(props: SpanParagraphProps): {svg: string; lineCount: number} {
    const chars = props.charsPerLine ?? 36
    const lh = props.lineHeight ?? 14
    const bodyColor = props.bodyColor ?? tokens.colors.text.secondary
    const highlightColor = props.highlightColor ?? tokens.colors.text.accent
    const size = props.fontSize ?? tokens.typography.sizes.body

    const plain = props.spans.map((s) => s.text).join('')
    const lines = wrapText({value: plain, charsPerLine: chars})

    let charOffset = 0
    const out = lines
        .map((line, i) => {
            const lineStart = charOffset
            const lineEnd = lineStart + line.length
            charOffset = lineEnd + 1
            const lineSpans = sliceSpans(props.spans, lineStart, lineEnd)
            const y = props.y + i * lh
            const tspans = lineSpans
                .map((s) => {
                    const fill = s.highlight ? highlightColor : bodyColor
                    return `<tspan fill="${fill}">${escapeXml(s.text)}</tspan>`
                })
                .join('')
            return `<text x="${props.x}" y="${y}" font-family="${escapeAttr(tokens.typography.sans)}" font-size="${size}">${tspans}</text>`
        })
        .join('')
    return {svg: out, lineCount: lines.length}
}
