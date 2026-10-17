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
        description: 'Ore is an ingredient in Plate, Beam, and Resonator.',
        color: categoryColors.ore,
    },
    {
        id: 'crystal',
        name: 'Crystal',
        label: 'Crystal',
        description: 'Crystal is an ingredient in Sensor, Resonator, and Resin.',
        color: categoryColors.crystal,
    },
    {
        id: 'gas',
        name: 'Gas',
        label: 'Gas',
        description: 'Gas is an ingredient in Plasma Cell, Beam, and Reactor.',
        color: categoryColors.gas,
    },
    {
        id: 'regolith',
        name: 'Regolith',
        label: 'Regolith',
        description: 'Regolith is an ingredient in Ceramic, Frame, and Reactor.',
        color: categoryColors.regolith,
    },
    {
        id: 'biomass',
        name: 'Biomass',
        label: 'Biomass',
        description: 'Biomass is an ingredient in Polymer, Frame, and Resin.',
        color: categoryColors.biomass,
    },
]

export function getCategoryInfo(): CategoryInfo[]
export function getCategoryInfo(id: ResourceCategory): CategoryInfo | undefined
export function getCategoryInfo(id?: ResourceCategory): CategoryInfo[] | CategoryInfo | undefined {
    if (id === undefined) return categories
    return categories.find((c) => c.id === id)
}
