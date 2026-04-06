import type {ResourceCategory, ResourceTier} from '../types'

export const categoryColors: Record<ResourceCategory, string> = {
    metal: '#7B8D9E',
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
