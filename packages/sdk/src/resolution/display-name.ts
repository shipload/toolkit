import type {ResolvedItem} from './resolve-item'
import type {ResourceCategory} from '../types'
import {
    CATEGORY_LABELS,
    RESOURCE_TIER_ADJECTIVES,
    COMPONENT_TIER_PREFIXES,
    MODULE_TIER_PREFIXES,
} from '../types'
import {formatMass as defaultFormatMass} from '../format'

interface DisplayNameInputCommon {
    tier: number
    category?: ResourceCategory
    name: string
}

export type DisplayNameInput =
    | (DisplayNameInputCommon & {itemType: 'resource' | 'component' | 'module' | 'entity' | string})
    | (DisplayNameInputCommon & {type: string})

function itemTypeOf(item: DisplayNameInput): string {
    return 'itemType' in item ? item.itemType : item.type
}

function tierPrefix(item: DisplayNameInput): string | null {
    const t = itemTypeOf(item)
    if (t === 'resource') return RESOURCE_TIER_ADJECTIVES[item.tier] ?? null
    if (t === 'component') return COMPONENT_TIER_PREFIXES[item.tier] ?? null
    if (t === 'module') return MODULE_TIER_PREFIXES[item.tier] ?? null
    return null
}

function rootName(item: DisplayNameInput): string {
    if (itemTypeOf(item) !== 'resource') return item.name
    return item.category ? CATEGORY_LABELS[item.category] : 'Resource'
}

// Tier-free display name: includes the resource tier adjective / component-module
// prefix, but no "(T#)" suffix. Use this when the tier is shown separately.
export function baseName(item: DisplayNameInput): string {
    const prefix = tierPrefix(item)
    const root = rootName(item)
    return prefix ? `${prefix} ${root}` : root
}

export function displayName(item: DisplayNameInput): string {
    return `${baseName(item)} (T${item.tier})`
}

export interface DescribeOptions {
    translate?: (key: string) => string
    formatNumber?: (n: number) => string
    formatMass?: (kg: number) => string
}

export function describeItem(resolved: ResolvedItem, opts?: DescribeOptions): string {
    const massFmt = opts?.formatMass ?? defaultFormatMass
    const mass = massFmt(resolved.mass)
    const tier = `T${resolved.tier}`
    if (resolved.itemType === 'resource') {
        const cat = resolved.category ? CATEGORY_LABELS[resolved.category] : 'Resource'
        const header = `${tier} ${cat}`
        const stats = resolved.stats?.map((s) => `${s.label} ${s.value}`).join(', ')
        return [header, stats, mass].filter(Boolean).join(' · ')
    }
    return `${tier} ${resolved.name} · ${mass}`
}
