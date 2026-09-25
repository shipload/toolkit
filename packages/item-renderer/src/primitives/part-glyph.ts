import {el, escapeXml} from './svg.ts'

export const partGlyphKinds = ['refined', 'machined', 'modules', 'hulls'] as const

export type PartGlyphKind = (typeof partGlyphKinds)[number]

export interface PartGlyphSvgOpts {
    size?: number
    title?: string
    className?: string
}

const TITLES: Record<PartGlyphKind, string> = {
    refined: 'Refined components',
    machined: 'Machined components',
    modules: 'Modules',
    hulls: 'Hulls',
}

const BODIES: Record<PartGlyphKind, string> = {
    refined: '<path d="M10 44 L19 22 H45 L54 44 Z" fill="currentColor"/>',
    machined:
        '<path d="M6 48 L12 34 H30 L36 48 Z M28 30 L34 16 H52 L58 30 Z" fill="currentColor"/>' +
        '<path d="M26 40 L38 26" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    modules:
        '<rect x="17" y="17" width="30" height="30" rx="3" fill="currentColor"/>' +
        '<path d="M24 10 V17 M32 10 V17 M40 10 V17 M24 47 V54 M32 47 V54 M40 47 V54" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    hulls: '<path d="M32 6 L47 25 V49 L32 58 L17 49 V25 Z" fill="currentColor"/>',
}

export function partGlyphSvg(kind: PartGlyphKind, opts: PartGlyphSvgOpts = {}): string {
    const size = opts.size ?? 64
    const title = opts.title ?? TITLES[kind]
    return el(
        'svg',
        {
            xmlns: 'http://www.w3.org/2000/svg',
            width: size,
            height: size,
            viewBox: '0 0 64 64',
            role: 'img',
            class: opts.className,
            'aria-label': title,
        },
        `<title>${escapeXml(title)}</title>${BODIES[kind]}`
    )
}
