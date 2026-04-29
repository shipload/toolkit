import items from './items.json'

export interface ItemMetadata {
    name: string
    description: string
    color: string
}

export interface EntityMetadata {
    moduleSlotLabels?: string[]
}

export const itemMetadata: Record<number, ItemMetadata> = {
    // === Resources (raw) ===
    101: {name: 'Ore', description: 'Crude metallic ore.', color: '#C26D3F'},
    102: {name: 'Ore', description: 'Refined metallic ore with improved purity.', color: '#C26D3F'},
    103: {
        name: 'Ore',
        description: 'High-grade metallic ore with exceptional density.',
        color: '#C26D3F',
    },
    201: {name: 'Crystal', description: 'Raw resonant crystal.', color: '#4ADBFF'},
    202: {
        name: 'Crystal',
        description: 'Refined resonant crystal with improved clarity.',
        color: '#4ADBFF',
    },
    203: {
        name: 'Crystal',
        description: 'High-grade resonant crystal with exceptional purity.',
        color: '#4ADBFF',
    },
    301: {name: 'Gas', description: 'Raw volatile gas.', color: '#B8E4A0'},
    302: {
        name: 'Gas',
        description: 'Refined volatile gas with improved reactivity.',
        color: '#B8E4A0',
    },
    303: {
        name: 'Gas',
        description: 'High-grade volatile gas with exceptional energy density.',
        color: '#B8E4A0',
    },
    401: {name: 'Regolith', description: 'Crude regolith dust.', color: '#C4A57B'},
    402: {
        name: 'Regolith',
        description: 'Refined regolith with improved fineness.',
        color: '#C4A57B',
    },
    403: {
        name: 'Regolith',
        description: 'High-grade regolith with exceptional uniformity.',
        color: '#C4A57B',
    },
    501: {name: 'Biomass', description: 'Crude organic biomass.', color: '#5A8B3E'},
    502: {
        name: 'Biomass',
        description: 'Refined biomass with improved plasticity.',
        color: '#5A8B3E',
    },
    503: {
        name: 'Biomass',
        description: 'High-grade biomass with exceptional saturation.',
        color: '#5A8B3E',
    },

    // === Components (T1) ===
    10001: {
        name: 'Hull Plates',
        description: 'Structural plating formed from ore. Used in hulls, containers, and frames.',
        color: '#7B8D9E',
    },
    10002: {
        name: 'Cargo Lining',
        description:
            'Composite lining formed from fine regolith bound in biomass polymer. Dense enough to seal cargo holds, flexible enough to absorb vibration.',
        color: '#C4A57B',
    },
    10003: {
        name: 'Thruster Core',
        description: 'High-energy propulsion component formed from volatile gases.',
        color: '#E86344',
    },
    10004: {
        name: 'Power Cell',
        description:
            'Crystalline energy storage matrix. Resonant lattices retain and release charge.',
        color: '#4ADBFF',
    },
    10005: {
        name: 'Matter Conduit',
        description: 'Heavy-duty ore shaft used in gathering equipment.',
        color: '#7B8D9E',
    },
    10006: {
        name: 'Survey Probe',
        description: 'Crystal-lattice sensor array for deep resource detection.',
        color: '#4ADBFF',
    },
    10007: {
        name: 'Cargo Arm',
        description: 'Flexible biomass composite arm for cargo handling.',
        color: '#5A8B3E',
    },
    10008: {
        name: 'Tool Bit',
        description: 'Dense regolith cutting head for crafting operations.',
        color: '#C4A57B',
    },
    10009: {
        name: 'Reaction Chamber',
        description: 'Gas-pressurized vessel for controlled crafting reactions.',
        color: '#B8E4A0',
    },
    10010: {
        name: 'Focusing Array',
        description:
            "Precision-formed crystal lens array. Routes the haul beam's energy efficiently to the target lock.",
        color: '#4ADBFF',
    },

    // === Modules (T1) ===
    10100: {
        name: 'Engine',
        description: 'Basic propulsion system. Converts volatile gases into thrust.',
        color: '#E86344',
    },
    10101: {
        name: 'Generator',
        description: 'Basic energy system. Stores and recharges energy from resonant crystals.',
        color: '#4ADBFF',
    },
    10102: {
        name: 'Gatherer',
        description: 'Basic gathering system. Probes and conduits for raw resources.',
        color: '#7B8D9E',
    },
    10103: {
        name: 'Loader',
        description: 'Basic cargo handling system. Loads and unloads cargo with articulated arms.',
        color: '#5A8B3E',
    },
    10104: {
        name: 'Crafter',
        description:
            'Basic crafting system. Processes materials using reaction chambers and cutting tools.',
        color: '#B8E4A0',
    },
    10105: {
        name: 'Storage',
        description: 'Expands cargo capacity based on hull material quality.',
        color: '#8B7355',
    },
    10106: {
        name: 'Hauler',
        description:
            'Projects a haul beam to lock onto and transport containers or warehouses through group travel.',
        color: '#4ADBFF',
    },
    10107: {
        name: 'Warp',
        description:
            'Folds local space-time around the hull, projecting the ship across vast distances in a single discharge of the entire energy reserve.',
        color: '#9be4ff',
    },

    // === Entities (packed, T1) ===
    10200: {
        name: 'Container',
        description: 'Passive floating cargo storage in space. Towed by ships.',
        color: '#7B8D9E',
    },
    10201: {
        name: 'Ship',
        description: 'General-purpose vessel with 5 module slots.',
        color: '#4AE898',
    },
    10202: {
        name: 'Warehouse',
        description: 'Massive stationary storage facility with a single loader module slot.',
        color: '#EAB308',
    },

    // === Components (T2) ===
    20001: {
        name: 'Hull Plates',
        description: 'Advanced structural plating reinforced with tier 2 ore.',
        color: '#9BADB8',
    },
    20002: {
        name: 'Cargo Lining',
        description:
            'Advanced composite lining reinforced with tier 2 regolith and biomass polymer.',
        color: '#C4A57B',
    },

    // === Entities (packed, T2) ===
    20200: {
        name: 'Container',
        description: 'Advanced cargo container with improved capacity formulas.',
        color: '#9BADB8',
    },
}

export const entityMetadata: Record<number, EntityMetadata> = {
    10201: {moduleSlotLabels: ['Engine', 'Generator', 'Gatherer', 'Loader', 'Storage']},
    10202: {moduleSlotLabels: ['Loader', 'Storage', 'Storage', 'Storage', 'Storage']},
}

for (const item of items as Array<{id: number}>) {
    if (!itemMetadata[item.id]) {
        throw new Error(`Missing metadata for item ${item.id}. Add an entry to metadata.ts.`)
    }
}
