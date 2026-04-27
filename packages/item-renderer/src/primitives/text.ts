import {el} from './svg.ts'
import {tokens} from '../tokens/index.ts'

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
}

export function text(props: TextProps): string {
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
        escapeValue(props.value)
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
