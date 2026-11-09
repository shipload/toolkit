import {CATEGORY_LABELS, type ResourceCategory} from '../types'
import {defineText, text} from '../text/registry'
import {categoryColors} from './colors'

export interface CategoryInfo {
    id: ResourceCategory
    name: string
    label: string
    description: string
    color: string
}

const CATEGORIES: CategoryInfo[] = [
    {
        id: 'ore',
        name: 'Ore',
        label: 'Ore',
        description: 'Ore is an ingredient in Plate and Beam.',
        color: categoryColors.ore,
    },
    {
        id: 'crystal',
        name: 'Crystal',
        label: 'Crystal',
        description: 'Crystal is an ingredient in Sensor and Resonator.',
        color: categoryColors.crystal,
    },
    {
        id: 'gas',
        name: 'Gas',
        label: 'Gas',
        description: 'Gas is an ingredient in Plasma Cell and Reactor.',
        color: categoryColors.gas,
    },
    {
        id: 'regolith',
        name: 'Regolith',
        label: 'Regolith',
        description: 'Regolith is an ingredient in Ceramic and Frame.',
        color: categoryColors.regolith,
    },
    {
        id: 'biomass',
        name: 'Biomass',
        label: 'Biomass',
        description: 'Biomass is an ingredient in Polymer and Resin.',
        color: categoryColors.biomass,
    },
]

const categories: CategoryInfo[] = CATEGORIES.map((c) => {
    defineText({[`category.${c.id}.description`]: c.description})
    return {
        id: c.id,
        get name() {
            return CATEGORY_LABELS[c.id]
        },
        get label() {
            return CATEGORY_LABELS[c.id]
        },
        get description() {
            return text(`category.${c.id}.description`)
        },
        color: c.color,
    }
})

export function getCategoryInfo(): CategoryInfo[]
export function getCategoryInfo(id: ResourceCategory): CategoryInfo | undefined
export function getCategoryInfo(id?: ResourceCategory): CategoryInfo[] | CategoryInfo | undefined {
    if (id === undefined) return categories
    return categories.find((c) => c.id === id)
}
