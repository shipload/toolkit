import {
    ITEM_CRAFTER_T1,
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_HAULER_T1,
    ITEM_LOADER_T1,
    ITEM_STORAGE_T1,
    MODULE_ANY,
    MODULE_CRAFTER,
    MODULE_ENGINE,
    MODULE_GATHERER,
    MODULE_GENERATOR,
    MODULE_HAULER,
    MODULE_LOADER,
    MODULE_STORAGE,
} from '../capabilities/modules'
import type {ResourceCategory} from '../types'

export {
    ITEM_ENGINE_T1,
    ITEM_GENERATOR_T1,
    ITEM_GATHERER_T1,
    ITEM_LOADER_T1,
    ITEM_CRAFTER_T1,
    ITEM_STORAGE_T1,
    ITEM_HAULER_T1,
}

export const ITEM_MATTER_CONDUIT = 10005
export const ITEM_SURVEY_PROBE = 10006
export const ITEM_CARGO_ARM = 10007
export const ITEM_TOOL_BIT = 10008
export const ITEM_REACTION_CHAMBER = 10009
export const ITEM_FOCUSING_ARRAY = 10010

export const ITEM_HULL_PLATES = 10001
export const ITEM_CARGO_LINING = 10002
export const ITEM_CONTAINER_T1_PACKED = 10200
export const ITEM_THRUSTER_CORE = 10003
export const ITEM_POWER_CELL = 10004
export const ITEM_SHIP_T1_PACKED = 10201
export const ITEM_WAREHOUSE_T1_PACKED = 10202

export const ITEM_HULL_PLATES_T2 = 20001
export const ITEM_CARGO_LINING_T2 = 20002
export const ITEM_CONTAINER_T2_PACKED = 20200

export interface RecipeInput {
    category?: ResourceCategory
    itemId?: number
    quantity: number
}

export interface ComponentStat {
    key: string
    source: ResourceCategory
}

export interface ComponentDefinition {
    id: number
    name: string
    description: string
    color: string
    mass: number
    stats: ComponentStat[]
    recipe: RecipeInput[]
    usedIn: {type: 'entity' | 'module'; name: string}[]
}

export interface ModuleSlot {
    type: number
    label?: string
}

export interface EntityRecipe {
    id: string
    name: string
    description: string
    color: string
    packedItemId: number
    recipe: RecipeInput[]
    stats: {key: string; sourceComponentId: number; sourceStatKey: string}[]
    moduleSlots?: ModuleSlot[]
}

export interface CraftableItem {
    type: 'component' | 'entity' | 'module'
    id: number | string
    name: string
    description: string
    color: string
}

export const components: ComponentDefinition[] = [
    {
        id: ITEM_HULL_PLATES,
        name: 'Hull Plates',
        description: 'Structural plating formed from ore. Used in hulls, containers, and frames.',
        color: '#7B8D9E',
        mass: 50000,
        stats: [
            {key: 'strength', source: 'ore'},
            {key: 'density', source: 'ore'},
        ],
        recipe: [{category: 'ore', quantity: 15}],
        usedIn: [
            {type: 'entity', name: 'Container'},
            {type: 'entity', name: 'Warehouse'},
            {type: 'entity', name: 'Ship'},
        ],
    },
    {
        id: ITEM_CARGO_LINING,
        name: 'Cargo Lining',
        description:
            'Composite lining formed from fine regolith bound in biomass polymer. Dense enough to seal cargo holds, flexible enough to absorb vibration.',
        color: '#C4A57B',
        mass: 30000,
        stats: [
            {key: 'fineness', source: 'regolith'},
            {key: 'saturation', source: 'biomass'},
        ],
        recipe: [
            {category: 'regolith' as ResourceCategory, quantity: 10},
            {category: 'biomass' as ResourceCategory, quantity: 20},
        ],
        usedIn: [
            {type: 'entity', name: 'Container'},
            {type: 'module', name: 'Loader'},
            {type: 'module', name: 'Storage'},
        ],
    },
    {
        id: ITEM_THRUSTER_CORE,
        name: 'Thruster Core',
        description: 'High-energy propulsion component formed from volatile gases.',
        color: '#E86344',
        mass: 50000,
        stats: [
            {key: 'volatility', source: 'gas'},
            {key: 'thermal', source: 'gas'},
        ],
        recipe: [{category: 'gas' as ResourceCategory, quantity: 32}],
        usedIn: [{type: 'module', name: 'Engine'}],
    },
    {
        id: ITEM_POWER_CELL,
        name: 'Power Cell',
        description:
            'Crystalline energy storage matrix. Resonant lattices retain and release charge.',
        color: '#4ADBFF',
        mass: 30000,
        stats: [
            {key: 'resonance', source: 'crystal'},
            {key: 'reflectivity', source: 'crystal'},
        ],
        recipe: [{category: 'crystal' as ResourceCategory, quantity: 20}],
        usedIn: [
            {type: 'module', name: 'Generator'},
            {type: 'module', name: 'Hauler'},
        ],
    },
    {
        id: ITEM_MATTER_CONDUIT,
        name: 'Matter Conduit',
        description: 'Heavy-duty ore shaft used in gathering equipment.',
        color: '#7B8D9E',
        mass: 50000,
        stats: [
            {key: 'strength', source: 'ore'},
            {key: 'tolerance', source: 'ore'},
        ],
        recipe: [{category: 'ore' as ResourceCategory, quantity: 15}],
        usedIn: [{type: 'module', name: 'Gatherer'}],
    },
    {
        id: ITEM_SURVEY_PROBE,
        name: 'Survey Probe',
        description: 'Crystal-lattice sensor array for deep resource detection.',
        color: '#4ADBFF',
        mass: 30000,
        stats: [
            {key: 'conductivity', source: 'crystal'},
            {key: 'reflectivity', source: 'crystal'},
        ],
        recipe: [{category: 'crystal' as ResourceCategory, quantity: 10}],
        usedIn: [{type: 'module', name: 'Gatherer'}],
    },
    {
        id: ITEM_CARGO_ARM,
        name: 'Cargo Arm',
        description: 'Flexible biomass composite arm for cargo handling.',
        color: '#5A8B3E',
        mass: 30000,
        stats: [
            {key: 'plasticity', source: 'biomass'},
            {key: 'insulation', source: 'biomass'},
        ],
        recipe: [{category: 'biomass' as ResourceCategory, quantity: 32}],
        usedIn: [{type: 'module', name: 'Loader'}],
    },
    {
        id: ITEM_TOOL_BIT,
        name: 'Tool Bit',
        description: 'Dense regolith cutting head for crafting operations.',
        color: '#C4A57B',
        mass: 30000,
        stats: [
            {key: 'hardness', source: 'regolith'},
            {key: 'composition', source: 'regolith'},
        ],
        recipe: [{category: 'regolith' as ResourceCategory, quantity: 20}],
        usedIn: [{type: 'module', name: 'Crafter'}],
    },
    {
        id: ITEM_REACTION_CHAMBER,
        name: 'Reaction Chamber',
        description: 'Gas-pressurized vessel for controlled crafting reactions.',
        color: '#B8E4A0',
        mass: 50000,
        stats: [
            {key: 'reactivity', source: 'gas'},
            {key: 'thermal', source: 'gas'},
        ],
        recipe: [{category: 'gas' as ResourceCategory, quantity: 32}],
        usedIn: [{type: 'module', name: 'Crafter'}],
    },
    {
        id: ITEM_FOCUSING_ARRAY,
        name: 'Focusing Array',
        description:
            "Precision-formed crystal lens array. Routes the haul beam's energy efficiently to the target lock.",
        color: '#4ADBFF',
        mass: 40000,
        stats: [
            {key: 'conductivity', source: 'crystal'},
            {key: 'resonance', source: 'crystal'},
        ],
        recipe: [{category: 'crystal' as ResourceCategory, quantity: 25}],
        usedIn: [{type: 'module', name: 'Hauler'}],
    },
    {
        id: ITEM_HULL_PLATES_T2,
        name: 'Hull Plates T2',
        description: 'Advanced structural plating reinforced with tier 2 ore.',
        color: '#9BADB8',
        mass: 50000,
        stats: [
            {key: 'strength', source: 'ore'},
            {key: 'density', source: 'ore'},
        ],
        recipe: [
            {itemId: ITEM_HULL_PLATES, quantity: 2},
            {category: 'ore', quantity: 15},
        ],
        usedIn: [{type: 'entity', name: 'Container'}],
    },
    {
        id: ITEM_CARGO_LINING_T2,
        name: 'Cargo Lining',
        description:
            'Advanced composite lining reinforced with tier 2 regolith and biomass polymer.',
        color: '#C4A57B',
        mass: 45000,
        stats: [
            {key: 'fineness', source: 'regolith'},
            {key: 'saturation', source: 'biomass'},
        ],
        recipe: [
            {itemId: ITEM_CARGO_LINING, quantity: 2},
            {category: 'regolith' as ResourceCategory, quantity: 5},
            {category: 'biomass' as ResourceCategory, quantity: 10},
        ],
        usedIn: [{type: 'entity', name: 'Container'}],
    },
]

export const entityRecipes: EntityRecipe[] = [
    {
        id: 'container',
        name: 'Container',
        description: 'Passive floating cargo storage in space. Towed by ships.',
        color: '#7B8D9E',
        packedItemId: ITEM_CONTAINER_T1_PACKED,
        recipe: [
            {itemId: ITEM_HULL_PLATES, quantity: 6},
            {itemId: ITEM_CARGO_LINING, quantity: 2},
        ],
        stats: [
            {key: 'strength', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'strength'},
            {key: 'density', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'density'},
            {key: 'fineness', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'fineness'},
            {key: 'saturation', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'saturation'},
        ],
    },
    {
        id: 'ship-t1',
        name: 'Ship',
        description: 'General-purpose vessel with 5 module slots.',
        color: '#4AE898',
        packedItemId: ITEM_SHIP_T1_PACKED,
        recipe: [
            {itemId: ITEM_HULL_PLATES, quantity: 8},
            {itemId: ITEM_CARGO_LINING, quantity: 4},
        ],
        stats: [
            {key: 'strength', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'strength'},
            {key: 'density', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'density'},
            {key: 'fineness', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'fineness'},
            {key: 'saturation', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'saturation'},
        ],
        moduleSlots: [
            {type: MODULE_ANY},
            {type: MODULE_ANY},
            {type: MODULE_ANY},
            {type: MODULE_ANY},
            {type: MODULE_ANY},
        ],
    },
    {
        id: 'warehouse-t1',
        name: 'Warehouse',
        description: 'Massive stationary storage facility with a single loader module slot.',
        color: '#EAB308',
        packedItemId: ITEM_WAREHOUSE_T1_PACKED,
        recipe: [
            {itemId: ITEM_HULL_PLATES, quantity: 20},
            {itemId: ITEM_CARGO_LINING, quantity: 10},
        ],
        stats: [
            {key: 'strength', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'strength'},
            {key: 'density', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'density'},
            {key: 'fineness', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'fineness'},
            {key: 'saturation', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'saturation'},
        ],
        moduleSlots: [
            {type: MODULE_LOADER, label: 'Loader'},
            {type: MODULE_STORAGE, label: 'Storage'},
            {type: MODULE_STORAGE, label: 'Storage'},
            {type: MODULE_STORAGE, label: 'Storage'},
            {type: MODULE_STORAGE, label: 'Storage'},
        ],
    },
    {
        id: 'container-t2',
        name: 'Container',
        description: 'Advanced cargo container with improved capacity formulas.',
        color: '#9BADB8',
        packedItemId: ITEM_CONTAINER_T2_PACKED,
        recipe: [
            {itemId: ITEM_HULL_PLATES_T2, quantity: 6},
            {itemId: ITEM_CARGO_LINING_T2, quantity: 2},
        ],
        stats: [
            {key: 'strength', sourceComponentId: ITEM_HULL_PLATES_T2, sourceStatKey: 'strength'},
            {key: 'density', sourceComponentId: ITEM_HULL_PLATES_T2, sourceStatKey: 'density'},
            {key: 'fineness', sourceComponentId: ITEM_CARGO_LINING_T2, sourceStatKey: 'fineness'},
            {
                key: 'saturation',
                sourceComponentId: ITEM_CARGO_LINING_T2,
                sourceStatKey: 'saturation',
            },
        ],
    },
]

export interface ModuleRecipe {
    id: string
    name: string
    description: string
    color: string
    itemId: number
    moduleType: number
    recipe: RecipeInput[]
    stats: {key: string; sourceComponentId: number; sourceStatKey: string}[]
}

export const moduleRecipes: ModuleRecipe[] = [
    {
        id: 'engine-t1',
        name: 'Engine',
        description: 'Basic propulsion system. Converts volatile gases into thrust.',
        color: '#E86344',
        itemId: ITEM_ENGINE_T1,
        moduleType: MODULE_ENGINE,
        recipe: [{itemId: ITEM_THRUSTER_CORE, quantity: 6}],
        stats: [
            {key: 'volatility', sourceComponentId: ITEM_THRUSTER_CORE, sourceStatKey: 'volatility'},
            {key: 'thermal', sourceComponentId: ITEM_THRUSTER_CORE, sourceStatKey: 'thermal'},
        ],
    },
    {
        id: 'generator-t1',
        name: 'Generator',
        description: 'Basic energy system. Stores and recharges energy from resonant crystals.',
        color: '#4ADBFF',
        itemId: ITEM_GENERATOR_T1,
        moduleType: MODULE_GENERATOR,
        recipe: [{itemId: ITEM_POWER_CELL, quantity: 5}],
        stats: [
            {key: 'resonance', sourceComponentId: ITEM_POWER_CELL, sourceStatKey: 'resonance'},
            {
                key: 'reflectivity',
                sourceComponentId: ITEM_POWER_CELL,
                sourceStatKey: 'reflectivity',
            },
        ],
    },
    {
        id: 'gatherer-t1',
        name: 'Gatherer',
        description: 'Basic gathering system. Probes and conduits for raw resources.',
        color: '#7B8D9E',
        itemId: ITEM_GATHERER_T1,
        moduleType: MODULE_GATHERER,
        recipe: [
            {itemId: ITEM_MATTER_CONDUIT, quantity: 4},
            {itemId: ITEM_SURVEY_PROBE, quantity: 3},
        ],
        stats: [
            {key: 'strength', sourceComponentId: ITEM_MATTER_CONDUIT, sourceStatKey: 'strength'},
            {key: 'tolerance', sourceComponentId: ITEM_MATTER_CONDUIT, sourceStatKey: 'tolerance'},
            {
                key: 'reflectivity',
                sourceComponentId: ITEM_SURVEY_PROBE,
                sourceStatKey: 'reflectivity',
            },
            {
                key: 'conductivity',
                sourceComponentId: ITEM_SURVEY_PROBE,
                sourceStatKey: 'conductivity',
            },
            {
                key: 'reflectivity_speed',
                sourceComponentId: ITEM_SURVEY_PROBE,
                sourceStatKey: 'reflectivity',
            },
        ],
    },
    {
        id: 'loader-t1',
        name: 'Loader',
        description: 'Basic cargo handling system. Loads and unloads cargo with articulated arms.',
        color: '#5A8B3E',
        itemId: ITEM_LOADER_T1,
        moduleType: MODULE_LOADER,
        recipe: [
            {itemId: ITEM_CARGO_LINING, quantity: 3},
            {itemId: ITEM_CARGO_ARM, quantity: 3},
        ],
        stats: [
            {key: 'fineness', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'fineness'},
            {key: 'plasticity', sourceComponentId: ITEM_CARGO_ARM, sourceStatKey: 'plasticity'},
        ],
    },
    {
        id: 'crafter-t1',
        name: 'Crafter',
        description:
            'Basic crafting system. Processes materials using reaction chambers and cutting tools.',
        color: '#B8E4A0',
        itemId: ITEM_CRAFTER_T1,
        moduleType: MODULE_CRAFTER,
        recipe: [
            {itemId: ITEM_TOOL_BIT, quantity: 3},
            {itemId: ITEM_REACTION_CHAMBER, quantity: 3},
        ],
        stats: [
            {
                key: 'reactivity',
                sourceComponentId: ITEM_REACTION_CHAMBER,
                sourceStatKey: 'reactivity',
            },
            {key: 'composition', sourceComponentId: ITEM_TOOL_BIT, sourceStatKey: 'composition'},
        ],
    },
    {
        id: 'storage-t1',
        name: 'Storage',
        description: 'Expands cargo capacity based on hull material quality',
        color: '#8B7355',
        itemId: ITEM_STORAGE_T1,
        moduleType: MODULE_STORAGE,
        recipe: [
            {itemId: ITEM_HULL_PLATES, quantity: 8},
            {itemId: ITEM_CARGO_LINING, quantity: 4},
        ],
        stats: [
            {key: 'strength', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'strength'},
            {key: 'density', sourceComponentId: ITEM_HULL_PLATES, sourceStatKey: 'density'},
            {key: 'fineness', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'fineness'},
            {key: 'saturation', sourceComponentId: ITEM_CARGO_LINING, sourceStatKey: 'saturation'},
        ],
    },
    {
        id: 'hauler-t1',
        name: 'Hauler',
        description:
            'Projects a haul beam to lock onto and transport containers or warehouses through group travel.',
        color: '#4ADBFF',
        itemId: ITEM_HAULER_T1,
        moduleType: MODULE_HAULER,
        recipe: [
            {itemId: ITEM_POWER_CELL, quantity: 3},
            {itemId: ITEM_FOCUSING_ARRAY, quantity: 3},
        ],
        stats: [
            {key: 'resonance', sourceComponentId: ITEM_POWER_CELL, sourceStatKey: 'resonance'},
            {
                key: 'reflectivity',
                sourceComponentId: ITEM_POWER_CELL,
                sourceStatKey: 'reflectivity',
            },
            {
                key: 'conductivity',
                sourceComponentId: ITEM_FOCUSING_ARRAY,
                sourceStatKey: 'conductivity',
            },
        ],
    },
]

export function getModuleRecipe(id: string): ModuleRecipe | undefined {
    return moduleRecipes.find((r) => r.id === id)
}

export function getModuleRecipeByItemId(itemId: number): ModuleRecipe | undefined {
    return moduleRecipes.find((r) => r.itemId === itemId)
}

export function getComponentById(id: number): ComponentDefinition | undefined {
    return components.find((c) => c.id === id)
}

export function getEntityRecipe(id: string): EntityRecipe | undefined {
    return entityRecipes.find((r) => r.id === id)
}

export function getEntityRecipeByItemId(itemId: number): EntityRecipe | undefined {
    return entityRecipes.find((r) => r.packedItemId === itemId)
}

export function getEntitySlotLayout(packedItemId: number): ModuleSlot[] {
    const recipe = getEntityRecipeByItemId(packedItemId)
    return recipe?.moduleSlots ?? []
}

export function getAllCraftableItems(): CraftableItem[] {
    const items: CraftableItem[] = []
    for (const comp of components) {
        items.push({
            type: 'component',
            id: comp.id,
            name: comp.name,
            description: comp.description,
            color: comp.color,
        })
    }
    for (const entity of entityRecipes) {
        items.push({
            type: 'entity',
            id: entity.id,
            name: entity.name,
            description: entity.description,
            color: entity.color,
        })
    }
    for (const mod of moduleRecipes) {
        items.push({
            type: 'module',
            id: mod.id,
            name: mod.name,
            description: mod.description,
            color: mod.color,
        })
    }
    return items
}

export function getComponentsForCategory(category: ResourceCategory): ComponentDefinition[] {
    return components.filter((c) => c.recipe.some((r) => r.category === category))
}

export function getComponentsForStat(statKey: string): ComponentDefinition[] {
    return components.filter((c) => c.stats.some((s) => s.key === statKey))
}
