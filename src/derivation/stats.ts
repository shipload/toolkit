import type {ResourceCategory} from '../types'

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

const CRYSTAL_STATS: StatDefinition[] = [
    {
        key: 'conductivity',
        label: 'Conductivity',
        abbreviation: 'CON',
        purpose: 'Efficiency of energy/signal transfer through crystalline lattice',
    },
    {
        key: 'resonance',
        label: 'Resonance',
        abbreviation: 'RES',
        purpose: 'Frequency tuning and piezoelectric response — storage and amplification',
    },
    {
        key: 'reflectivity',
        label: 'Reflectivity',
        abbreviation: 'REF',
        purpose: 'Optical refraction and reflection — lenses, mirrors, focus',
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

const REGOLITH_STATS: StatDefinition[] = [
    {
        key: 'composition',
        label: 'Composition',
        abbreviation: 'COM',
        purpose: 'Mineral/metal mix — drives sensor, chip, and optic crafting quality',
    },
    {
        key: 'hardness',
        label: 'Hardness',
        abbreviation: 'HRD',
        purpose: 'Particle hardness — cutting surfaces, abrasives, wear resistance',
    },
    {
        key: 'fineness',
        label: 'Fineness',
        abbreviation: 'FIN',
        purpose: 'Grain size — fine powder for smooth composites and sintering',
    },
]

const BIOMASS_STATS: StatDefinition[] = [
    {
        key: 'plasticity',
        label: 'Plasticity',
        abbreviation: 'PLA',
        purpose: 'Flexibility and deformation under load',
    },
    {
        key: 'insulation',
        label: 'Insulation',
        abbreviation: 'INS',
        purpose: 'Thermal and electrical blocking capacity',
    },
    {
        key: 'saturation',
        label: 'Saturation',
        abbreviation: 'SAT',
        purpose: 'Concentration of useful organic compounds per unit',
    },
]

const STAT_MAP: Record<ResourceCategory, StatDefinition[]> = {
    ore: ORE_STATS,
    crystal: CRYSTAL_STATS,
    gas: GAS_STATS,
    regolith: REGOLITH_STATS,
    biomass: BIOMASS_STATS,
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
