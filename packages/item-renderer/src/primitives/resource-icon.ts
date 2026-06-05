import {CATEGORY_LABELS, categoryColors, type ResourceCategory} from '@shipload/sdk'
import {el, escapeXml} from './svg.ts'

export const resourceIconCategories = [
    'ore',
    'crystal',
    'gas',
    'regolith',
    'biomass',
] as const satisfies readonly ResourceCategory[]

export interface ResourceIconSvgOpts {
    size?: number
    title?: string
    className?: string
}

export interface ResourceIconInlineOpts {
    x: number
    y: number
    size: number
}

const OUTLINE = '#06142f'
const HILITE = '#f7fbff'
const OUTER_STROKE = 4
const DETAIL_STROKE = 2.5

function oreIcon(): string {
    return [
        el('path', {
            d: 'M13 24 L25 11 L43 13 L55 27 L48 49 L27 56 L12 42 Z',
            fill: categoryColors.ore,
            stroke: OUTLINE,
            'stroke-width': OUTER_STROKE,
            'stroke-linejoin': 'round',
        }),
        el('path', {d: 'M25 11 L31 30 L13 24 Z', fill: '#e39a5e'}),
        el('path', {d: 'M31 30 L43 13 L55 27 L41 32 Z', fill: '#b85b35'}),
        el('path', {d: 'M31 30 L41 32 L48 49 L27 56 Z', fill: '#8f432e'}),
        el('path', {
            d: 'M31 30 L25 11 M31 30 L13 24 M31 30 L41 32 M41 32 L48 49 M31 30 L27 56',
            fill: 'none',
            stroke: OUTLINE,
            'stroke-width': 1.5,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            opacity: 0.28,
        }),
        el('path', {
            d: 'M21 23 L27 18 M42 20 L48 27',
            fill: 'none',
            stroke: '#ffd29c',
            'stroke-width': DETAIL_STROKE,
            'stroke-linecap': 'round',
            opacity: 0.72,
        }),
    ].join('')
}

function crystalIcon(): string {
    return [
        el('path', {
            d: 'M32 6 L49 24 L39 58 L23 58 L14 25 Z',
            fill: categoryColors.crystal,
            stroke: OUTLINE,
            'stroke-width': OUTER_STROKE,
            'stroke-linejoin': 'round',
        }),
        el('path', {d: 'M32 6 L32 58 L14 25 Z', fill: '#1fb9e4'}),
        el('path', {d: 'M32 6 L49 24 L32 58 Z', fill: '#8df0ff'}),
        el('path', {d: 'M23 58 L32 32 L39 58 Z', fill: '#2f87d7', opacity: 0.72}),
        el('path', {
            d: 'M32 6 L32 58 M14 25 L32 32 L49 24 M23 58 L32 32 L39 58',
            fill: 'none',
            stroke: OUTLINE,
            'stroke-width': 1.5,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            opacity: 0.25,
        }),
        el('path', {
            d: 'M25 20 L31 13 M38 19 L43 25',
            fill: 'none',
            stroke: HILITE,
            'stroke-width': DETAIL_STROKE,
            'stroke-linecap': 'round',
            opacity: 0.78,
        }),
    ].join('')
}

function gasIcon(): string {
    return [
        el('circle', {
            cx: 32,
            cy: 32,
            r: 23,
            fill: categoryColors.gas,
            stroke: OUTLINE,
            'stroke-width': OUTER_STROKE,
        }),
        el('path', {
            d: 'M17 33 C21 20 38 18 44 27 C51 38 37 51 25 43',
            fill: 'none',
            stroke: '#7a48d9',
            'stroke-width': 7.5,
            'stroke-linecap': 'round',
        }),
        el('path', {
            d: 'M21 33 C25 25 36 25 39 31 C43 38 35 44 28 39',
            fill: 'none',
            stroke: '#f0d7ff',
            'stroke-width': 5,
            'stroke-linecap': 'round',
        }),
        el('circle', {
            cx: 44,
            cy: 18,
            r: 5,
            fill: '#f0d7ff',
            stroke: OUTLINE,
            'stroke-width': DETAIL_STROKE,
        }),
        el('circle', {
            cx: 19,
            cy: 47,
            r: 4,
            fill: '#f0d7ff',
            stroke: OUTLINE,
            'stroke-width': DETAIL_STROKE,
        }),
    ].join('')
}

function regolithIcon(): string {
    return [
        el('path', {
            d: 'M16 14 H45 L54 25 V46 L43 55 H17 L9 43 V24 Z',
            fill: categoryColors.regolith,
            stroke: OUTLINE,
            'stroke-width': OUTER_STROKE,
            'stroke-linejoin': 'round',
        }),
        el('path', {d: 'M16 14 H45 L54 25 L34 28 Z', fill: '#dec59a'}),
        el('path', {d: 'M9 43 L34 28 L43 55 H17 Z', fill: '#9e7c55', opacity: 0.78}),
        el('path', {
            d: 'M16 14 L34 28 L54 25 M34 28 L43 55 M34 28 L9 43',
            fill: 'none',
            stroke: OUTLINE,
            'stroke-width': 1.5,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            opacity: 0.25,
        }),
        el('circle', {cx: 25, cy: 28, r: 4, fill: '#806248', stroke: OUTLINE, 'stroke-width': 1.5}),
        el('circle', {cx: 42, cy: 40, r: 5, fill: '#8b6a4d', stroke: OUTLINE, 'stroke-width': 1.5}),
        el('circle', {
            cx: 22,
            cy: 44,
            r: 3,
            fill: '#e7d0a9',
            stroke: OUTLINE,
            'stroke-width': 1.25,
        }),
        el('path', {
            d: 'M35 18 L45 23',
            fill: 'none',
            stroke: '#f0dbb7',
            'stroke-width': DETAIL_STROKE,
            'stroke-linecap': 'round',
            opacity: 0.72,
        }),
    ].join('')
}

function biomassIcon(): string {
    return [
        el('path', {
            d: 'M32 7 C37 14 42 17 50 16 C50 24 54 29 57 35 C51 39 48 44 47 52 C39 50 36 55 31 59 C27 52 21 50 13 53 C14 45 10 40 7 34 C13 29 14 23 12 16 C21 18 26 14 32 7 Z',
            fill: categoryColors.biomass,
            stroke: OUTLINE,
            'stroke-width': OUTER_STROKE,
            'stroke-linejoin': 'round',
        }),
        el('circle', {cx: 32, cy: 32, r: 13, fill: '#73ad49', stroke: OUTLINE, 'stroke-width': 2}),
        el('circle', {cx: 27, cy: 28, r: 5, fill: '#a8db6f', stroke: OUTLINE, 'stroke-width': 1.5}),
        el('circle', {cx: 38, cy: 34, r: 5, fill: '#2f6f35', stroke: OUTLINE, 'stroke-width': 1.5}),
        el('circle', {cx: 30, cy: 41, r: 4, fill: '#89c85a', stroke: OUTLINE, 'stroke-width': 1.5}),
        el('circle', {
            cx: 40,
            cy: 24,
            r: 3,
            fill: '#c9ef8a',
            stroke: OUTLINE,
            'stroke-width': 1.25,
        }),
    ].join('')
}

const iconBodies: Record<ResourceCategory, string> = {
    ore: oreIcon(),
    crystal: crystalIcon(),
    gas: gasIcon(),
    regolith: regolithIcon(),
    biomass: biomassIcon(),
}

export function resourceIconBody(category: ResourceCategory): string {
    return iconBodies[category]
}

export function resourceIcon(category: ResourceCategory, opts: ResourceIconInlineOpts): string {
    const scale = opts.size / 64
    return el(
        'g',
        {transform: `translate(${opts.x} ${opts.y}) scale(${scale})`, 'data-resource': category},
        resourceIconBody(category)
    )
}

export function resourceIconSvg(
    category: ResourceCategory,
    opts: ResourceIconSvgOpts = {}
): string {
    const size = opts.size ?? 64
    const title = opts.title ?? `${CATEGORY_LABELS[category]} resource icon`
    const children = `<title>${escapeXml(title)}</title>${resourceIconBody(category)}`
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
        children
    )
}
