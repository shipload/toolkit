import type { ResolvedItem } from '@shipload/sdk'
import type { CargoItem } from './payload/codec.ts'
import { linkToItemSocial } from './links.ts'
import { SOCIAL_CARD_WIDTH, SOCIAL_CARD_HEIGHT } from './templates/social-card.ts'

function tierLabel(tier: string): string {
  return tier.toUpperCase()
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)
}

function formatTonnes(kg: number): string {
  const t = kg / 1000
  const fixed = t >= 100 ? 0 : 1
  return `${t.toFixed(fixed).replace(/\.0$/, '')} t`
}

function findAttribute(resolved: ResolvedItem, capability: string, label: string): number | undefined {
  const group = resolved.attributes?.find((g) => g.capability === capability)
  return group?.attributes.find((a) => a.label === label)?.value
}

function describeResource(r: ResolvedItem): string {
  const header = [tierLabel(r.tier), r.category ? capitalize(r.category) : '', 'resource']
    .filter(Boolean)
    .join(' ')
  const stats = r.stats?.map((s) => `${s.label} ${s.value.toLocaleString('en-US')}`).join(', ')
  const mass = r.mass > 0 ? formatTonnes(r.mass) : ''
  return [header, stats, mass].filter(Boolean).join(' · ')
}

function describeEntity(r: ResolvedItem): string {
  const kind = r.name.toLowerCase().replace(/\s*t\d+.*$/, '').trim() || 'entity'
  const header = `${tierLabel(r.tier)} ${kind}`
  const installed = r.moduleSlots?.filter((s) => s.installed).map((s) => s.name).filter(Boolean) as string[] | undefined
  const modules = installed && installed.length > 0 ? installed.join(', ') : 'empty loadout'
  const hullMass = findAttribute(r, 'Hull', 'Mass')
  const capacity = findAttribute(r, 'Hull', 'Capacity')
  const tail: string[] = []
  if (capacity) tail.push(`Capacity ${capacity.toLocaleString('en-US')}`)
  if (hullMass) tail.push(`Hull ${formatTonnes(hullMass)}`)
  return [header, modules, ...tail].join(' · ')
}

function describeModuleOrComponent(r: ResolvedItem): string {
  const header = `${tierLabel(r.tier)} ${r.name}`
  const kind = r.itemType === 'module' ? 'module' : 'component'
  const stats = r.stats?.map((s) => `${s.label} ${s.value.toLocaleString('en-US')}`).join(' / ')
  const mass = r.mass > 0 ? formatTonnes(r.mass) : ''
  return [`${header} ${kind}`, stats, mass].filter(Boolean).join(' · ')
}

function describeItem(resolved: ResolvedItem): string {
  switch (resolved.itemType) {
    case 'resource':
      return describeResource(resolved)
    case 'entity':
      return describeEntity(resolved)
    case 'module':
    case 'component':
      return describeModuleOrComponent(resolved)
    default:
      return `${tierLabel(resolved.tier)} ${resolved.name}`
  }
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
