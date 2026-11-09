import type {ResourceCategory} from '../types'
import {textFields} from '../text/registry'

export interface StatDefinition {
    key: string
    label: string
    abbreviation: string
    purpose: string
    inverted?: boolean
}

const ORE_STATS: StatDefinition[] = [
    {
        key: 'strength',
        label: 'Strength',
        abbreviation: 'STR',
        purpose: 'How much load the ore bears before it fails',
    },
    {
        key: 'tolerance',
        label: 'Tolerance',
        abbreviation: 'TOL',
        purpose: 'How well the ore holds up under heat, pressure, and stress',
    },
    {
        key: 'density',
        label: 'Density',
        abbreviation: 'DEN',
        purpose: 'How much mass the ore packs into its volume',
    },
]

const CRYSTAL_STATS: StatDefinition[] = [
    {
        key: 'conductivity',
        label: 'Conductivity',
        abbreviation: 'CON',
        purpose: 'How freely energy passes through the crystal lattice',
    },
    {
        key: 'resonance',
        label: 'Resonance',
        abbreviation: 'RES',
        purpose: 'How strongly the crystal vibrates in a field',
    },
    {
        key: 'reflectivity',
        label: 'Reflectivity',
        abbreviation: 'REF',
        purpose: 'How much light the crystal bends and reflects',
    },
]

const GAS_STATS: StatDefinition[] = [
    {
        key: 'volatility',
        label: 'Volatility',
        abbreviation: 'VOL',
        purpose: 'How much energy the gas releases when it burns',
    },
    {
        key: 'reactivity',
        label: 'Reactivity',
        abbreviation: 'REA',
        purpose: 'How fast the gas reacts with other materials',
    },
    {
        key: 'thermal',
        label: 'Thermal',
        abbreviation: 'THM',
        purpose: 'How much heat the gas absorbs',
    },
]

const REGOLITH_STATS: StatDefinition[] = [
    {
        key: 'cohesion',
        label: 'Cohesion',
        abbreviation: 'COH',
        purpose: 'How tightly the grains bind together',
    },
    {
        key: 'hardness',
        label: 'Hardness',
        abbreviation: 'HRD',
        purpose: 'How hard each grain is',
    },
    {
        key: 'fineness',
        label: 'Fineness',
        abbreviation: 'FIN',
        purpose: 'How fine the grains are',
    },
]

const BIOMASS_STATS: StatDefinition[] = [
    {
        key: 'plasticity',
        label: 'Plasticity',
        abbreviation: 'PLA',
        purpose: 'How far the biomass bends under load without breaking',
    },
    {
        key: 'insulation',
        label: 'Insulation',
        abbreviation: 'INS',
        purpose: 'How well the biomass blocks heat and current',
    },
    {
        key: 'saturation',
        label: 'Saturation',
        abbreviation: 'SAT',
        purpose: 'How much useful organic compound each unit holds',
    },
]

function translated(defs: StatDefinition[]): StatDefinition[] {
    return defs.map((def) =>
        textFields(
            {...def},
            {label: def.label, abbreviation: def.abbreviation, purpose: def.purpose},
            (field) => `stat.${def.key}.${field}`
        )
    )
}

const STAT_MAP: Record<ResourceCategory, StatDefinition[]> = {
    ore: translated(ORE_STATS),
    crystal: translated(CRYSTAL_STATS),
    gas: translated(GAS_STATS),
    regolith: translated(REGOLITH_STATS),
    biomass: translated(BIOMASS_STATS),
}

export function getStatDefinitions(category: ResourceCategory): StatDefinition[] {
    return STAT_MAP[category]
}

export function findStatDefinition(
    key: string
): {category: ResourceCategory; definition: StatDefinition} | undefined {
    for (const category of Object.keys(STAT_MAP) as ResourceCategory[]) {
        const definition = STAT_MAP[category].find((d) => d.key === key)
        if (definition) return {category, definition}
    }
    return undefined
}

export function getStatName(category: ResourceCategory, index: 0 | 1 | 2): StatDefinition {
    return STAT_MAP[category][index]
}

export interface NamedStats {
    definitions: StatDefinition[]
    values: [number, number, number]
}

export function resolveStats(
    category: ResourceCategory,
    stats: {stat1: number; stat2: number; stat3: number}
): NamedStats {
    return {
        definitions: STAT_MAP[category],
        values: [stats.stat1, stats.stat2, stats.stat3],
    }
}
