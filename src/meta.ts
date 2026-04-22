import type { ResolvedItem } from '@shipload/sdk'
import type { CargoItem } from './payload/codec.ts'
import { linkToItemSocial } from './links.ts'
import { SOCIAL_CARD_WIDTH, SOCIAL_CARD_HEIGHT } from './templates/social-card.ts'

function tierLabel(tier: string): string {
  return tier.toUpperCase()
}

function categoryLabel(resolved: ResolvedItem): string {
  if (!resolved.category) return ''
  return resolved.category[0]!.toUpperCase() + resolved.category.slice(1)
}

function describeItem(resolved: ResolvedItem): string {
  const parts: string[] = []
  if (resolved.category) parts.push(categoryLabel(resolved))
  parts.push(tierLabel(resolved.tier))
  parts.push(`${resolved.mass.toLocaleString('en-US')} kg`)
  return parts.join(' · ')
}

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
    title: `${resolved.name} · Shipload Guide`,
    description: describeItem(resolved),
    ogImage: linkToItemSocial(item, opts?.imageBaseUrl),
    ogImageWidth: SOCIAL_CARD_WIDTH,
    ogImageHeight: SOCIAL_CARD_HEIGHT,
  }
}
