import type {ResolvedItem} from './resolve-item'
import type {ResourceCategory} from '../types'
import {
    CATEGORY_LABELS,
    RESOURCE_TIER_ADJECTIVES,
    COMPONENT_TIER_PREFIXES,
    MODULE_TIER_PREFIXES,
} from '../types'
import {formatMass as defaultFormatMass} from '../format'
import {compose, defineText, formatNumber as defaultFormatNumber, text} from '../text/registry'

defineText({
    'compose.describe.resource': '{tier} {category} · {stats} · {mass}',
    'compose.describe.resource-bare': '{tier} {category} · {mass}',
    'compose.describe.item': '{tier} {name} · {mass}',
    'compose.stat-value': '{label} {value}',
})

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
    return item.category ? CATEGORY_LABELS[item.category] : text('category.resource')
}

// Tier-free display name: includes the resource tier adjective / component-module
// prefix, but no "(T#)" suffix. Use this when the tier is shown separately.
export function baseName(item: DisplayNameInput): string {
    const prefix = tierPrefix(item)
    const root = rootName(item)
    return prefix ? compose('compose.resource-name', {tier: prefix, category: root}) : root
}

export function displayName(item: DisplayNameInput): string {
    return compose('compose.tier-suffix', {name: baseName(item), tier: String(item.tier)})
}

export interface DescribeOptions {
    formatNumber?: (n: number) => string
    formatMass?: (mass: number) => string
}

export function describeItem(resolved: ResolvedItem, opts?: DescribeOptions): string {
    const massFmt = opts?.formatMass ?? defaultFormatMass
    const numberFmt = opts?.formatNumber ?? defaultFormatNumber
    const mass = massFmt(resolved.mass)
    const tier = compose('compose.tier-tag', {tier: String(resolved.tier)})
    if (resolved.itemType === 'resource') {
        const category = resolved.category
            ? CATEGORY_LABELS[resolved.category]
            : text('category.resource')
        const stats = resolved.stats
            ?.map((s) => compose('compose.stat-value', {label: s.label, value: numberFmt(s.value)}))
            .join(text('compose.separator.list'))
        if (!stats) return compose('compose.describe.resource-bare', {tier, category, mass})
        return compose('compose.describe.resource', {tier, category, stats, mass})
    }
    return compose('compose.describe.item', {tier, name: resolved.name, mass})
}
