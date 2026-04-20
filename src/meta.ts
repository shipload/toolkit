import type { ResolvedItem } from '@shipload/sdk'
import type { CargoItem } from './payload/codec.ts'
import { linkToItemImage } from './links.ts'

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

export interface ItemPageMeta {
  title: string
  description: string
  ogImage: string
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
    ogImage: linkToItemImage(item, 'png', opts?.imageBaseUrl),
  }
}
