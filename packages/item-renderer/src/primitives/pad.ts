import {el} from './svg.ts'
import {svgDimensions} from '../meta.ts'
import {tokens} from '../tokens/index.ts'

export const MIN_PAD = 0
export const MAX_PAD = 64

export function clampPad(pad: number): number {
    if (!Number.isFinite(pad)) return MIN_PAD
    return Math.max(MIN_PAD, Math.min(MAX_PAD, Math.round(pad)))
}

export function padSvg(svg: string, pad: number): string {
    const p = clampPad(pad)
    if (p === MIN_PAD) return svg
    const {width, height} = svgDimensions(svg)
    const w = width + p * 2
    const h = height + p * 2
    const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
        el('rect', {width: w, height: h, fill: tokens.colors.surface.spaceDeep}) +
        `<g transform="translate(${p} ${p})">${inner}</g>` +
        `</svg>`
    )
}
