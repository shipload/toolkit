import type {ResolvedItem} from '@shipload/sdk'
import type {CargoItem} from '../payload/codec.ts'
import {renderByType} from './index.ts'
import {STARDUST_BASE64} from '../assets/stardust-base64.ts'
import {svgDimensions} from '../meta.ts'

export const SOCIAL_CARD_WIDTH = 1200
export const SOCIAL_CARD_HEIGHT = 630

const SPACE_DEEP = '#050c24'
const STARDUST_TILE = 512
const ITEM_MAX_WIDTH_RATIO = 0.35
const ITEM_MAX_HEIGHT_RATIO = 0.82
const DOMAIN_LABEL = 'shiploadgame.com'

export function socialCardSvg(item: CargoItem, resolved: ResolvedItem): string {
    const itemSvg = renderByType(item, resolved)
    const {width: itemW, height: itemH} = svgDimensions(itemSvg)

    const scale = Math.min(
        (SOCIAL_CARD_WIDTH * ITEM_MAX_WIDTH_RATIO) / itemW,
        (SOCIAL_CARD_HEIGHT * ITEM_MAX_HEIGHT_RATIO) / itemH
    )
    const scaledW = itemW * scale
    const scaledH = itemH * scale
    const tx = (SOCIAL_CARD_WIDTH - scaledW) / 2
    const ty = (SOCIAL_CARD_HEIGHT - scaledH) / 2

    const itemInner = itemSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${SOCIAL_CARD_WIDTH}" height="${SOCIAL_CARD_HEIGHT}" viewBox="0 0 ${SOCIAL_CARD_WIDTH} ${SOCIAL_CARD_HEIGHT}">` +
        `<defs>` +
        `<pattern id="sc-stars" width="${STARDUST_TILE}" height="${STARDUST_TILE}" patternUnits="userSpaceOnUse">` +
        `<image xlink:href="data:image/png;base64,${STARDUST_BASE64}" width="${STARDUST_TILE}" height="${STARDUST_TILE}"/>` +
        `</pattern>` +
        `</defs>` +
        `<rect width="${SOCIAL_CARD_WIDTH}" height="${SOCIAL_CARD_HEIGHT}" fill="${SPACE_DEEP}"/>` +
        `<rect width="${SOCIAL_CARD_WIDTH}" height="${SOCIAL_CARD_HEIGHT}" fill="url(#sc-stars)" opacity="0.75"/>` +
        `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})">${itemInner}</g>` +
        `<text x="${SOCIAL_CARD_WIDTH - 40}" y="${SOCIAL_CARD_HEIGHT - 36}" text-anchor="end" fill="#e6e8ec" opacity="0.55" font-size="22" font-family="Inter, sans-serif" letter-spacing="0.04em">${DOMAIN_LABEL}</text>` +
        `</svg>`
    )
}
