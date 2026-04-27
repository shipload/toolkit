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
        id: 'ore',
        name: 'Ore',
        label: 'Ore',
        description: 'Structural metal-bearing rock — hulls, frames, load-bearing components',
        color: categoryColors.ore,
    },
    {
        id: 'crystal',
        name: 'Crystal',
        label: 'Crystal',
        description: 'Crystalline lattice — conductors, energy storage, resonant systems',
        color: categoryColors.crystal,
    },
    {
        id: 'gas',
        name: 'Gas',
        label: 'Gas',
        description: 'Atmospheric volatile — propulsion, thermal processing, chemical reactions',
        color: categoryColors.gas,
    },
    {
        id: 'regolith',
        name: 'Regolith',
        label: 'Regolith',
        description: 'Surface mineral dust — sensors, optics, computation, cutting surfaces',
        color: categoryColors.regolith,
    },
    {
        id: 'biomass',
        name: 'Biomass',
        label: 'Biomass',
        description: 'Organic polymer — insulation, composites, bio-processes',
        color: categoryColors.biomass,
    },
]

export function getCategoryInfo(): CategoryInfo[]
export function getCategoryInfo(id: ResourceCategory): CategoryInfo | undefined
export function getCategoryInfo(id?: ResourceCategory): CategoryInfo[] | CategoryInfo | undefined {
    if (id === undefined) return categories
    return categories.find((c) => c.id === id)
}
