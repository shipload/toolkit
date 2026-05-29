import {el} from './svg.ts'
import {tokens} from '../tokens/index.ts'

export interface TextSpan {
    value: string
    size?: number
    weight?: 400 | 600 | 700 | 500
    color?: string
    dx?: number
}

export interface TextProps {
    x: number
    y: number
    value: string
    size?: number
    weight?: 400 | 600 | 700 | 500
    family?: string
    color?: string
    anchor?: 'start' | 'middle' | 'end'
    letterSpacing?: number
    dominantBaseline?: 'auto' | 'middle' | 'central' | 'hanging' | 'text-top' | 'text-bottom'
    // Optional trailing tspans that flow inline after value (no manual width math).
    spans?: TextSpan[]
}

export function text(props: TextProps): string {
    const body = props.spans?.length
        ? escapeValue(props.value) + props.spans.map(renderSpan).join('')
        : escapeValue(props.value)
    return el(
        'text',
        {
            x: props.x,
            y: props.y,
            'font-family': props.family ?? tokens.typography.sans,
            'font-size': props.size ?? tokens.typography.sizes.body,
            'font-weight': props.weight ?? 400,
            fill: props.color ?? tokens.colors.text.primary,
            'text-anchor': props.anchor,
            'letter-spacing': props.letterSpacing,
            'dominant-baseline': props.dominantBaseline,
        },
        body
    )
}

function renderSpan(span: TextSpan): string {
    return el(
        'tspan',
        {
            dx: span.dx,
            'font-size': span.size,
            'font-weight': span.weight,
            fill: span.color,
        },
        escapeValue(span.value)
    )
}

function escapeValue(v: string): string {
    return v
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;')
}
