import items from './items.json'

export type ComponentProcess = 'refined' | 'machined'

export interface ItemFamily {
    name: string
    description: string
    color: string
    process?: ComponentProcess
}

export interface EntityMetadata {
    moduleSlotLabels?: string[]
}

export const itemFamilies: Record<string, ItemFamily> = {
    // === Resources ===
    ore: {
        name: 'Ore',
        description: 'Goes into Plate and Beam.',
        color: '#C26D3F',
    },
    crystal: {
        name: 'Crystal',
        description: 'Goes into Sensors and Resonators.',
        color: '#4ADBFF',
    },
    gas: {
        name: 'Gas',
        description: 'Goes into Plasma Cells and Reactors.',
        color: '#B877FF',
    },
    regolith: {
        name: 'Regolith',
        description: 'Goes into Ceramic and Frame.',
        color: '#C4A57B',
    },
    biomass: {
        name: 'Biomass',
        description: 'Goes into Polymer and Resin.',
        color: '#5A8B3E',
    },

    // === Components ===
    plate: {
        name: 'Plate',
        description: 'Goes into Cargo Holds, Containers, and hulls.',
        color: '#7B8D9E',
        process: 'refined',
    },
    frame: {
        name: 'Frame',
        description: 'Goes into Limpet Bays, Cargo Holds, and hulls.',
        color: '#C4A57B',
        process: 'machined',
    },
    'plasma-cell': {
        name: 'Plasma Cell',
        description: 'Goes into Engines, Battery Banks, and hulls.',
        color: '#E86344',
        process: 'refined',
    },
    resonator: {
        name: 'Resonator',
        description: 'Goes into Power Cores, Tractor Beams, Warp Drives, and hulls.',
        color: '#4ADBFF',
        process: 'machined',
    },
    beam: {
        name: 'Beam',
        description: 'Goes into Limpet Bays and hulls.',
        color: '#7B8D9E',
        process: 'machined',
    },
    sensor: {
        name: 'Sensor',
        description: 'Goes into Fabricators, Assembly Arms, and hulls.',
        color: '#4ADBFF',
        process: 'refined',
    },
    polymer: {
        name: 'Polymer',
        description: 'Goes into Shuttle Bays, Battery Banks, and hulls.',
        color: '#5A8B3E',
        process: 'refined',
    },
    ceramic: {
        name: 'Ceramic',
        description: 'Goes into Assembly Arms, Containers, and hulls.',
        color: '#C4A57B',
        process: 'refined',
    },
    reactor: {
        name: 'Reactor',
        description: 'Goes into Fabricators, Warp Drives, and hulls.',
        color: '#B877FF',
        process: 'machined',
    },
    resin: {
        name: 'Resin',
        description: 'Goes into Tractor Beams and hulls.',
        color: '#5A8B3E',
        process: 'machined',
    },

    // === Modules ===
    engine: {
        name: 'Engine',
        description: 'Moves a ship across the map.',
        color: '#E86344',
    },
    generator: {
        name: 'Power Core',
        description: 'Stores and recharges the energy work spends.',
        color: '#4ADBFF',
    },
    gatherer: {
        name: 'Limpet Bay',
        description: 'Gathers resources from a deposit.',
        color: '#7B8D9E',
    },
    loader: {
        name: 'Shuttle Bay',
        description: 'Moves cargo between entities at the same location.',
        color: '#5A8B3E',
    },
    crafter: {
        name: 'Fabricator',
        description: 'Turns resources and components into items.',
        color: '#B877FF',
    },
    storage: {
        name: 'Cargo Hold',
        description: 'Adds cargo capacity.',
        color: '#8B7355',
    },
    hauler: {
        name: 'Tractor Beam',
        description: 'Tows entities along with the ship.',
        color: '#4ADBFF',
    },
    warp: {
        name: 'Warp Drive',
        description: 'Jumps a long distance at once. Needs a full charge and an empty hold.',
        color: '#9be4ff',
    },
    battery: {
        name: 'Battery Bank',
        description: 'Adds energy capacity.',
        color: '#4ADBFF',
    },
    launcher: {
        name: 'Drive Coil',
        description: 'Launches cargo toward a Mass Catcher.',
        color: '#E86344',
    },
    builder: {
        name: 'Assembly Arm',
        description: 'Claims plots, builds them out, and upgrades ships alongside.',
        color: '#FFB347',
    },

    // === Entities ===
    container: {
        name: 'Container',
        description: 'Cargo storage that a Tractor Beam tows.',
        color: '#7B8D9E',
    },
    ship: {
        name: 'Ship',
        description: 'A hull for a mixed loadout.',
        color: '#4AE898',
    },
    warehouse: {
        name: 'Warehouse',
        description: "A station's stockpile.",
        color: '#EAB308',
    },
    'mining-rig': {
        name: 'Mining Rig',
        description: "A station's mine, gathering from the location it stands at.",
        color: '#D4726F',
    },
    factory: {
        name: 'Factory',
        description: "A station's production line.",
        color: '#7BA7D4',
    },
    'mass-driver': {
        name: 'Mass Driver',
        description: "A station's launcher, sending cargo to a Mass Catcher.",
        color: '#E86344',
    },
    'mass-catcher': {
        name: 'Mass Catcher',
        description: "A station's receiver for Mass Driver payloads.",
        color: '#4AE898',
    },
    'station-hub': {
        name: 'Station Hub',
        description:
            'Anchors a station; every other building sits on its footprint. One per location, at an asteroid, nebula, or ice field.',
        color: '#A0B8D0',
    },
    'assembly-yard': {
        name: 'Assembly Yard',
        description: "A station's construction site.",
        color: '#FFB347',
    },
    workshop: {
        name: 'Workshop',
        description: 'Public Fabricators. Book a job and collect the output when it finishes.',
        color: '#B877FF',
    },
    'construction-dock': {
        name: 'Construction Dock',
        description: 'Public upgrades for ships at the location.',
        color: '#FFB347',
    },
    nexus: {
        name: 'Nexus',
        description: 'Where players wrap, unwrap, and deploy assets.',
        color: '#FFD24C',
    },
    depot: {
        name: 'Depot',
        description: 'Public storage and shuttle service at the world.',
        color: '#EAB308',
    },
    roustabout: {
        name: 'Roustabout',
        description: 'A hull whose open slot takes any module.',
        color: '#4AE898',
    },
    prospector: {
        name: 'Prospector',
        description: 'A gathering ship.',
        color: '#4AE898',
    },
    tender: {
        name: 'Tender',
        description: 'A transfer ship, moving cargo between parked entities.',
        color: '#4AE898',
    },
    wright: {
        name: 'Wright',
        description: 'A construction ship, claiming and building plots.',
        color: '#4AE898',
    },
    tug: {
        name: 'Tug',
        description: 'A towing ship.',
        color: '#4AE898',
    },
    porter: {
        name: 'Porter',
        description: 'A cargo ship.',
        color: '#4AE898',
    },
    smith: {
        name: 'Smith',
        description: 'A crafting ship.',
        color: '#4AE898',
    },
    dredger: {
        name: 'Dredger',
        description: 'A gathering ship with a hold for longer runs.',
        color: '#4AE898',
    },
}

const COMPONENT_FAMILIES = [
    'plate',
    'frame',
    'plasma-cell',
    'resonator',
    'beam',
    'sensor',
    'polymer',
    'ceramic',
    'reactor',
    'resin',
]

const ENTITY_FAMILIES: Record<number, string> = {
    10200: 'container',
    10201: 'ship',
    10202: 'warehouse',
    10203: 'mining-rig',
    10204: 'factory',
    10205: 'mass-driver',
    10206: 'mass-catcher',
    10207: 'station-hub',
    10208: 'workshop',
    10209: 'construction-dock',
    10210: 'roustabout',
    10211: 'prospector',
    10212: 'tender',
    10213: 'wright',
    10214: 'tug',
    10215: 'porter',
    10216: 'nexus',
    10218: 'smith',
    10219: 'depot',
    11200: 'container',
    11202: 'warehouse',
    11203: 'mining-rig',
    11204: 'factory',
    11207: 'station-hub',
    11209: 'assembly-yard',
    11212: 'prospector',
    11213: 'prospector',
    11214: 'dredger',
}

interface RawItem {
    id: number
    type: string
    tier: number
    category?: string
    subtype?: string
}

const rawById = new Map<number, RawItem>((items as RawItem[]).map((raw) => [raw.id, raw]))

export function itemFamilyKey(itemId: number): string | undefined {
    const entity = ENTITY_FAMILIES[itemId]
    if (entity) return entity
    const raw = rawById.get(itemId)
    if (!raw) return undefined
    switch (raw.type) {
        case 'resource':
            return raw.category
        case 'module':
            return raw.subtype
        case 'component':
            return COMPONENT_FAMILIES[((itemId - 10000) % 1000) - 1]
        default:
            return undefined
    }
}

export function getItemFamily(itemId: number): ItemFamily | undefined {
    const key = itemFamilyKey(itemId)
    return key === undefined ? undefined : itemFamilies[key]
}

export const entityMetadata: Record<number, EntityMetadata> = {
    10201: {
        moduleSlotLabels: ['Engine', 'Power Core', 'Limpet Bay', 'Shuttle Bay', 'Cargo Hold'],
    },
    10210: {moduleSlotLabels: ['Power Core', 'Engine', 'Utility Bay']},
    10211: {moduleSlotLabels: ['Power Core', 'Engine', 'Limpet Bay']},
    10212: {moduleSlotLabels: ['Power Core', 'Engine', 'Shuttle Bay']},
    10213: {moduleSlotLabels: ['Power Core', 'Engine', 'Assembly Arm']},
    10214: {moduleSlotLabels: ['Power Core', 'Engine', 'Tractor Beam']},
    10215: {moduleSlotLabels: ['Power Core', 'Engine', 'Cargo Hold']},
    10218: {moduleSlotLabels: ['Power Core', 'Engine', 'Fabricator']},
    10202: {
        moduleSlotLabels: ['Shuttle Bay', 'Cargo Hold', 'Cargo Hold', 'Cargo Hold', 'Cargo Hold'],
    },
    10203: {moduleSlotLabels: ['Power Core', 'Limpet Bay']},
    10204: {moduleSlotLabels: ['Power Core', 'Fabricator']},
    10205: {moduleSlotLabels: ['Power Core', 'Drive Coil']},
    10206: {moduleSlotLabels: ['Cargo Hold', 'Cargo Hold', 'Cargo Hold']},
    10208: {
        moduleSlotLabels: ['Fabricator', 'Fabricator', 'Fabricator', 'Fabricator', 'Fabricator'],
    },
    10209: {moduleSlotLabels: ['Power Core', 'Assembly Arm']},
    10219: {
        moduleSlotLabels: [
            'Shuttle Bay',
            'Shuttle Bay',
            'Cargo Hold',
            'Cargo Hold',
            'Cargo Hold',
            'Cargo Hold',
        ],
    },
    11212: {moduleSlotLabels: ['Power Core', 'Engine', 'Limpet Bay']},
    11213: {
        moduleSlotLabels: ['Power Core', 'Engine', 'Auxiliary System', 'Limpet Bay'],
    },
    11214: {
        moduleSlotLabels: ['Power Core', 'Engine', 'Limpet Bay', 'Cargo Hold'],
    },
    11202: {
        moduleSlotLabels: ['Shuttle Bay', 'Cargo Hold', 'Cargo Hold', 'Cargo Hold', 'Cargo Hold'],
    },
    11203: {moduleSlotLabels: ['Power Core', 'Limpet Bay']},
    11204: {moduleSlotLabels: ['Power Core', 'Fabricator']},
    11209: {moduleSlotLabels: ['Power Core', 'Assembly Arm']},
}

for (const raw of items as RawItem[]) {
    const key = itemFamilyKey(raw.id)
    if (!key || !itemFamilies[key]) {
        throw new Error(`Missing family for item ${raw.id}. Add an entry to metadata.ts.`)
    }
}
