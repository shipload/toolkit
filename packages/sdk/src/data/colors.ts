import type {ResourceCategory} from '../types'

export const categoryColors: Record<ResourceCategory, string> = {
    ore: '#C26D3F',
    crystal: '#4ADBFF',
    gas: '#B8E4A0',
    regolith: '#C4A57B',
    biomass: '#5A8B3E',
}

export const tierColors: Record<number, string> = {
    1: '#8b8b8b',
    2: '#4ade80',
    3: '#818cf8',
    4: '#c084fc',
    5: '#fbbf24',
    6: '#f97316',
    7: '#ef4444',
    8: '#ec4899',
    9: '#06b6d4',
    10: '#ffffff',
}

// Rarity-tier names (badge labels). Kept disjoint from TIER_ADJECTIVES in
// types.ts (resource descriptors like "Pristine Ore") so the two vocabularies
// never collide at any tier.
export const tierLabels: Record<number, string> = {
    1: 'Common',
    2: 'Uncommon',
    3: 'Rare',
    4: 'Epic',
    5: 'Legendary',
    6: 'Mythic',
    7: 'Divine',
    8: 'Celestial',
    9: 'Eternal',
    10: 'Transcendent',
}

export const categoryIcons: Record<ResourceCategory, string> = {
    ore: '⬡',
    crystal: '◈',
    gas: '◎',
    regolith: '■',
    biomass: '❋',
}

export type CategoryIconShape = 'hex' | 'diamond' | 'star' | 'circle' | 'square'

export const categoryIconShapes: Record<ResourceCategory, CategoryIconShape> = {
    ore: 'hex',
    crystal: 'diamond',
    gas: 'circle',
    regolith: 'square',
    biomass: 'star',
}

export const componentIcon = '▣'
export const moduleIcon = '⬢'

export const itemAbbreviations: Record<number, string> = {
    10001: 'HP',
    10002: 'CL',
    10003: 'TC',
    10004: 'PC',
    10005: 'DS',
    10006: 'EP',
    10007: 'CA',
    10008: 'TB',
    10009: 'RC',
    10010: 'FA',
    10100: 'EN',
    10101: 'GN',
    10102: 'EX',
    10103: 'LD',
    10104: 'MF',
    10105: 'ST',
    10107: 'WP',
    10200: 'CT',
    10201: 'SH',
    10202: 'WH',
    20001: 'HP',
    20002: 'CL',
    20200: 'CT',
}
