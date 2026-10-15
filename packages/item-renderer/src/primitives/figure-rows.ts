import {text} from './text.ts'
import {wrapText} from './wrap.ts'
import {tokens} from '../tokens/index.ts'

export interface FigureRow {
    label: string
    value: string
}

export interface FigureRowsProps {
    x: number
    y: number
    width: number
    rows: FigureRow[]
    size: number
    rowHeight: number
    lineHeight: number
    charsPerLine: number
}

export function figureRowLines(row: FigureRow, charsPerLine: number): string[] {
    const valueChars = Math.max(12, charsPerLine - row.label.length - 2)
    return wrapText({value: row.value, charsPerLine: valueChars})
}

export function figureRows(props: FigureRowsProps): {
    svg: string
    lineCount: number
    height: number
} {
    let svg = ''
    let y = props.y
    let lineCount = 0
    props.rows.forEach((row, i) => {
        if (i > 0) y += props.rowHeight
        svg += text({
            x: props.x,
            y,
            value: row.label,
            size: props.size,
            color: tokens.colors.text.secondary,
        })
        figureRowLines(row, props.charsPerLine).forEach((line, j) => {
            if (j > 0) y += props.lineHeight
            svg += text({
                x: props.x + props.width,
                y,
                value: line,
                size: props.size,
                weight: 700,
                anchor: 'end',
            })
            lineCount++
        })
    })
    return {svg, lineCount, height: y - props.y}
}
