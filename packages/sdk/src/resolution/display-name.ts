import type {ResolvedItem} from './resolve-item'
import type {ResourceCategory} from '../types'
import {CATEGORY_LABELS, TIER_ADJECTIVES} from '../types'
import {formatMass as defaultFormatMass} from '../format'

export interface DisplayNameInput {
    itemType: 'resource' | 'component' | 'module' | 'entity' | string
    tier: number
    category?: ResourceCategory
    name: string
}

export function displayName(resolved: DisplayNameInput): string {
    if (resolved.itemType === 'resource') {
        const adj = TIER_ADJECTIVES[resolved.tier] ?? 'Unknown'
        const cat = resolved.category ? CATEGORY_LABELS[resolved.category] : 'Resource'
        return `${adj} ${cat}`
    }
    return resolved.name
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
