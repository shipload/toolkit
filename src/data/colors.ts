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

export const categoryIcons: Record<ResourceCategory, string> = {
    metal: '⬡',
    precious: '◈',
    gas: '◎',
    mineral: '◇',
    organic: '❋',
}

export const componentIcon = '▣'
export const moduleIcon = '⬢'

export const itemIcons: Record<number, string> = {
    10001: 'HP',
    10002: 'CL',
    10003: 'CT',
    10004: 'TC',
    10005: 'PC',
    10006: 'EN',
    10007: 'GN',
    10008: 'SH',
    10009: 'DS',
    10010: 'EP',
    10011: 'CA',
    10012: 'TB',
    10013: 'RC',
    10014: 'EX',
    10015: 'LD',
    10016: 'MF',
}
