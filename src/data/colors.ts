import type {ResourceCategory, ResourceTier} from '../types'

export const categoryColors: Record<ResourceCategory, string> = {
    metal: '#5B9BD5',
    precious: '#D4A843',
    gas: '#7EC8E3',
    mineral: '#B8A9C9',
    organic: '#6B8E5A',
}

export const tierColors: Record<ResourceTier, string> = {
    t1: '#8b8b8b',
    t2: '#4ade80',
    t3: '#818cf8',
    t4: '#c084fc',
    t5: '#fbbf24',
}

export const tierLabels: Record<ResourceTier, string> = {
    t1: 'Common',
    t2: 'Uncommon',
    t3: 'Rare',
    t4: 'Epic',
    t5: 'Legendary',
}

export const categoryIcons: Record<ResourceCategory, string> = {
    metal: '⬡',
    precious: '◈',
    gas: '◎',
    mineral: '◇',
    organic: '❋',
}

export type CategoryIconShape = 'hex' | 'diamond' | 'star' | 'circle' | 'square'

export const categoryIconShapes: Record<ResourceCategory, CategoryIconShape> = {
    metal: 'hex',
    precious: 'diamond',
    gas: 'circle',
    mineral: 'square',
    organic: 'star',
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
    10200: 'CT',
    10201: 'SH',
    10202: 'WH',
    20001: 'HP',
    20002: 'CL',
    20200: 'CT',
}
