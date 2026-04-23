import type { ResolvedItem } from '@shipload/sdk'
import { describeItem, displayName } from '@shipload/sdk'
import type { CargoItem } from './payload/codec.ts'
import { linkToItemSocial } from './links.ts'
import { SOCIAL_CARD_WIDTH, SOCIAL_CARD_HEIGHT } from './templates/social-card.ts'

const DIMS_RE = /<svg[^>]*?\bwidth="(\d+)"[^>]*?\bheight="(\d+)"/

export function svgDimensions(svg: string): { width: number; height: number } {
  const m = DIMS_RE.exec(svg)
  if (!m) throw new Error('svgDimensions: could not locate width/height on root <svg>')
  return { width: Number(m[1]), height: Number(m[2]) }
}

export interface ItemPageMeta {
  title: string
  description: string
  ogImage: string
  ogImageWidth: number
  ogImageHeight: number
}

export interface ItemPageMetaOptions {
  imageBaseUrl?: string
}

export function itemPageMeta(
  item: CargoItem,
  resolved: ResolvedItem,
  opts?: ItemPageMetaOptions,
): ItemPageMeta {
  return {
    title: `${displayName(resolved)} · Shipload Guide`,
    description: describeItem(resolved),
    ogImage: linkToItemSocial(item, opts?.imageBaseUrl),
    ogImageWidth: SOCIAL_CARD_WIDTH,
    ogImageHeight: SOCIAL_CARD_HEIGHT,
  }
}
