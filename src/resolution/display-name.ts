import type {ResolvedItem} from './resolve-item'
import type {ResourceCategory} from '../types'
import {formatMass as defaultFormatMass} from '../format'

const TIER_ADJECTIVES: Record<number, string> = {
    1: 'Crude',
    2: 'Dense',
    3: 'Pure',
    4: 'Prime',
    5: 'Pristine',
    6: 'Radiant',
    7: 'Exotic',
    8: 'Mythic',
    9: 'Cosmic',
    10: 'Ascendant',
}

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
    ore: 'Ore',
    crystal: 'Crystal',
    gas: 'Gas',
    regolith: 'Regolith',
    biomass: 'Biomass',
}

function tierNumber(tier: string): number {
    return Number(String(tier).replace(/^t/i, ''))
}

export function displayName(resolved: ResolvedItem): string {
    if (resolved.itemType === 'resource') {
        const tierNum = tierNumber(resolved.tier)
        const adj = TIER_ADJECTIVES[tierNum] ?? 'Unknown'
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
    const tier = `T${tierNumber(resolved.tier)}`
    if (resolved.itemType === 'resource') {
        const cat = resolved.category ? CATEGORY_LABELS[resolved.category] : 'Resource'
        const header = `${tier} ${cat}`
        const stats = resolved.stats?.map((s) => `${s.label} ${s.value}`).join(', ')
        return [header, stats, mass].filter(Boolean).join(' · ')
    }
    return `${tier} ${resolved.name} · ${mass}`
}
