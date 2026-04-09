import type {ResourceCategory} from '../types'
import {categoryColors} from './colors'

export interface CategoryInfo {
    id: ResourceCategory
    name: string
    label: string
    description: string
    color: string
}

const categories: CategoryInfo[] = [
    {
        id: 'metal',
        name: 'Metals',
        label: 'Metal',
        description: 'Structural, strong, heavy — hulls, frames, load-bearing components',
        color: categoryColors.metal,
    },
    {
        id: 'precious',
        name: 'Precious Metals',
        label: 'Precious',
        description:
            'Conductive, corrosion-resistant — electronics, energy systems, precision components',
        color: categoryColors.precious,
    },
    {
        id: 'gas',
        name: 'Gases',
        label: 'Gas',
        description:
            'Energy, fuel, volatile/reactive — propulsion, thermal processing, chemical reactions',
        color: categoryColors.gas,
    },
    {
        id: 'mineral',
        name: 'Minerals',
        label: 'Mineral',
        description: 'Crystalline, hard, precise — sensors, optics, energy storage, cutting surfaces',
        color: categoryColors.mineral,
    },
    {
        id: 'organic',
        name: 'Organics',
        label: 'Organic',
        description: 'Adaptive, biological, polymer — insulation, composites, bio-processes',
        color: categoryColors.organic,
    },
]

export function getCategoryInfo(): CategoryInfo[]
export function getCategoryInfo(id: ResourceCategory): CategoryInfo | undefined
export function getCategoryInfo(id?: ResourceCategory): CategoryInfo[] | CategoryInfo | undefined {
    if (id === undefined) return categories
    return categories.find((c) => c.id === id)
}
