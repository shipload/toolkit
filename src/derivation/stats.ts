import type {ResourceCategory} from '../types'

export interface StatDefinition {
    key: string
    label: string
    abbreviation: string
    purpose: string
    inverted?: boolean
}

const METAL_STATS: StatDefinition[] = [
    {
        key: 'strength',
        label: 'Strength',
        abbreviation: 'STR',
        purpose: 'Raw structural/mechanical force',
    },
    {
        key: 'tolerance',
        label: 'Tolerance',
        abbreviation: 'TOL',
        purpose: 'Ability to withstand heat, pressure, and stress extremes',
    },
    {
        key: 'density',
        label: 'Density',
        abbreviation: 'DEN',
        purpose: 'Mass per unit',
        inverted: true,
    },
]

const PRECIOUS_STATS: StatDefinition[] = [
    {
        key: 'conductivity',
        label: 'Conductivity',
        abbreviation: 'CON',
        purpose: 'Efficiency of energy/signal transfer',
    },
    {
        key: 'ductility',
        label: 'Ductility',
        abbreviation: 'DUC',
        purpose: 'Ability to be worked into fine, precise shapes',
    },
    {
        key: 'reflectivity',
        label: 'Reflectivity',
        abbreviation: 'REF',
        purpose: 'Surface quality for heat management and precision optics',
    },
]

const GAS_STATS: StatDefinition[] = [
    {
        key: 'volatility',
        label: 'Volatility',
        abbreviation: 'VOL',
        purpose: 'Energy release potential for propulsion and force',
    },
    {
        key: 'reactivity',
        label: 'Reactivity',
        abbreviation: 'REA',
        purpose: 'Chemical interaction speed for processing and penetration',
    },
    {
        key: 'thermal',
        label: 'Thermal',
        abbreviation: 'THM',
        purpose: 'Heat capacity for thermal management',
    },
]

const MINERAL_STATS: StatDefinition[] = [
    {
        key: 'resonance',
        label: 'Resonance',
        abbreviation: 'RES',
        purpose: 'Energy field interaction — storage, focusing, projection',
    },
    {
        key: 'hardness',
        label: 'Hardness',
        abbreviation: 'HRD',
        purpose: 'Resistance to wear — cutting surfaces, penetration',
    },
    {
        key: 'clarity',
        label: 'Clarity',
        abbreviation: 'CLR',
        purpose: 'Crystalline perfection — precision optics',
    },
]

const ORGANIC_STATS: StatDefinition[] = [
    {
        key: 'plasticity',
        label: 'Plasticity',
        abbreviation: 'PLA',
        purpose: 'Ease of reshaping — speeds processing',
    },
    {
        key: 'insulation',
        label: 'Insulation',
        abbreviation: 'INS',
        purpose: 'Energy containment — reduces energy loss',
    },
    {
        key: 'purity',
        label: 'Purity',
        abbreviation: 'PUR',
        purpose: 'Biological cleanliness — better composites and lubricants',
    },
]

const STAT_MAP: Record<ResourceCategory, StatDefinition[]> = {
    metal: METAL_STATS,
    precious: PRECIOUS_STATS,
    gas: GAS_STATS,
    mineral: MINERAL_STATS,
    organic: ORGANIC_STATS,
}

export function getStatDefinitions(category: ResourceCategory): StatDefinition[] {
    return STAT_MAP[category]
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
