import type {CargoItem} from './payload/codec.ts'
import {encodeCargoItem, encodeNftPayload} from './payload/codec.ts'

const DEFAULT_WEBSITE_BASE = 'https://shiploadgame.com'
const DEFAULT_IMAGE_BASE = 'https://item.shiploadgame.com'

export function linkToItemPage(item: CargoItem, baseUrl = DEFAULT_WEBSITE_BASE): string {
    const payload = encodeCargoItem(item)
    return `${baseUrl}/guide/item/${payload}`
}

export function linkToItemImage(
    item: CargoItem,
    ext: 'png' | 'svg',
    opts?: {location?: {x: number | bigint; y: number | bigint}; baseUrl?: string}
): string {
    const payload = encodeNftPayload({item, location: opts?.location ?? null})
    return `${opts?.baseUrl ?? DEFAULT_IMAGE_BASE}/item/${payload}.${ext}`
}

export function linkToItemSocial(
    item: CargoItem,
    opts?: {location?: {x: number | bigint; y: number | bigint}; baseUrl?: string}
): string {
    const payload = encodeNftPayload({item, location: opts?.location ?? null})
    return `${opts?.baseUrl ?? DEFAULT_IMAGE_BASE}/social/${payload}.png`
}
