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
    // === Resources / Ore ===
    101: {name: 'Ore', description: 'Crude metallic ore.', color: '#C26D3F'},
    102: {name: 'Ore', description: 'Refined metallic ore with improved purity.', color: '#C26D3F'},
    103: {
        name: 'Ore',
        description: 'High-grade metallic ore with exceptional density.',
        color: '#C26D3F',
    },
    104: {name: 'Ore', description: '', color: '#C26D3F'},
    105: {name: 'Ore', description: '', color: '#C26D3F'},
    106: {name: 'Ore', description: '', color: '#C26D3F'},
    107: {name: 'Ore', description: '', color: '#C26D3F'},
    108: {name: 'Ore', description: '', color: '#C26D3F'},
    109: {name: 'Ore', description: '', color: '#C26D3F'},
    110: {name: 'Ore', description: '', color: '#C26D3F'},

    // === Resources / Crystal ===
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
    204: {name: 'Crystal', description: '', color: '#4ADBFF'},
    205: {name: 'Crystal', description: '', color: '#4ADBFF'},
    206: {name: 'Crystal', description: '', color: '#4ADBFF'},
    207: {name: 'Crystal', description: '', color: '#4ADBFF'},
    208: {name: 'Crystal', description: '', color: '#4ADBFF'},
    209: {name: 'Crystal', description: '', color: '#4ADBFF'},
    210: {name: 'Crystal', description: '', color: '#4ADBFF'},

    // === Resources / Gas ===
    301: {name: 'Gas', description: 'Raw volatile gas.', color: '#B877FF'},
    302: {
        name: 'Gas',
        description: 'Refined volatile gas with improved reactivity.',
        color: '#B877FF',
    },
    303: {
        name: 'Gas',
        description: 'High-grade volatile gas with exceptional energy density.',
        color: '#B877FF',
    },
    304: {name: 'Gas', description: '', color: '#B877FF'},
    305: {name: 'Gas', description: '', color: '#B877FF'},
    306: {name: 'Gas', description: '', color: '#B877FF'},
    307: {name: 'Gas', description: '', color: '#B877FF'},
    308: {name: 'Gas', description: '', color: '#B877FF'},
    309: {name: 'Gas', description: '', color: '#B877FF'},
    310: {name: 'Gas', description: '', color: '#B877FF'},

    // === Resources / Regolith ===
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
    404: {name: 'Regolith', description: '', color: '#C4A57B'},
    405: {name: 'Regolith', description: '', color: '#C4A57B'},
    406: {name: 'Regolith', description: '', color: '#C4A57B'},
    407: {name: 'Regolith', description: '', color: '#C4A57B'},
    408: {name: 'Regolith', description: '', color: '#C4A57B'},
    409: {name: 'Regolith', description: '', color: '#C4A57B'},
    410: {name: 'Regolith', description: '', color: '#C4A57B'},

    // === Resources / Biomass ===
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
    504: {name: 'Biomass', description: '', color: '#5A8B3E'},
    505: {name: 'Biomass', description: '', color: '#5A8B3E'},
    506: {name: 'Biomass', description: '', color: '#5A8B3E'},
    507: {name: 'Biomass', description: '', color: '#5A8B3E'},
    508: {name: 'Biomass', description: '', color: '#5A8B3E'},
    509: {name: 'Biomass', description: '', color: '#5A8B3E'},
    510: {name: 'Biomass', description: '', color: '#5A8B3E'},

    // === Components (T1) ===
    10001: {
        name: 'Plate',
        description:
            'Structural plating formed from ore. Used in hulls, containers, and storage modules.',
        color: '#7B8D9E',
    },
    10002: {
        name: 'Frame',
        description:
            'Composite framing formed from fine regolith bound in biomass polymer. Dense enough to seal cargo holds, flexible enough to absorb vibration.',
        color: '#C4A57B',
    },
    10003: {
        name: 'Plasma Cell',
        description:
            'High-energy gaseous storage cell. Volatile gas held under controlled thermal conditions.',
        color: '#E86344',
    },
    10004: {
        name: 'Resonator',
        description:
            'Crystalline resonance lattice. Stores and releases charge through coherent oscillation.',
        color: '#4ADBFF',
    },
    10005: {
        name: 'Beam',
        description:
            'Heavy-duty structural beam machined from refined ore. Strong enough to bear load, tolerant enough to survive harsh environments.',
        color: '#7B8D9E',
    },
    10006: {
        name: 'Sensor',
        description:
            'Crystal-lattice sensing element with conductive and reflective properties. Reads signal and surface alike.',
        color: '#4ADBFF',
    },
    10007: {
        name: 'Polymer',
        description:
            'Pliable biomass-derived polymer with high insulation. Flexible, durable, electrically inert.',
        color: '#5A8B3E',
    },
    10008: {
        name: 'Ceramic',
        description:
            'Hardened fine-grained ceramic refined from regolith. Hard enough to cut, fine enough to finish.',
        color: '#C4A57B',
    },
    10009: {
        name: 'Reactor',
        description:
            'Gas-pressurized vessel for controlled reactions. Vents heat and contains volatility.',
        color: '#B877FF',
    },
    10010: {
        name: 'Resin',
        description:
            'Saturated organic binder cured from biomass. A pliable matrix for haulage and field components.',
        color: '#5A8B3E',
    },

    // === Modules (T1) ===
    10100: {
        name: 'Engine',
        description: 'Basic propulsion system. Converts volatile gases into thrust.',
        color: '#E86344',
    },
    10101: {
        name: 'Power Core',
        description: 'Basic energy system. Stores and recharges energy from resonant crystals.',
        color: '#4ADBFF',
    },
    10102: {
        name: 'Limpet Bay',
        description: 'Basic gathering system. Probes and conduits for raw resources.',
        color: '#7B8D9E',
    },
    10103: {
        name: 'Shuttle Bay',
        description: 'Basic cargo handling system. Loads and unloads cargo with articulated arms.',
        color: '#5A8B3E',
    },
    10104: {
        name: 'Fabricator',
        description:
            'Basic crafting system. Processes materials using reaction chambers and cutting tools.',
        color: '#B877FF',
    },
    10105: {
        name: 'Cargo Hold',
        description: 'Expanded cargo storage with reinforced internal holds.',
        color: '#8B7355',
    },
    10106: {
        name: 'Tractor Beam',
        description:
            'Projects a haul beam to lock onto and transport containers through group travel.',
        color: '#4ADBFF',
    },
    10107: {
        name: 'Warp Drive',
        description:
            'Folds local space-time around the hull, projecting the ship across vast distances in a single discharge of the entire energy reserve.',
        color: '#9be4ff',
    },
    10108: {
        name: 'Battery Bank',
        description: 'Stores additional charge produced by the power core.',
        color: '#4ADBFF',
    },
    10109: {
        name: 'Drive Coil',
        description: 'Accelerates and launches cargo payloads toward a remote mass catcher.',
        color: '#E86344',
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
    10203: {
        name: 'Mining Rig',
        description:
            'Planetary resource extraction facility with generator and gatherer module slots.',
        color: '#D4726F',
    },
    10204: {
        name: 'Factory',
        description: 'Planetary fabrication facility with generator and crafter module slots.',
        color: '#7BA7D4',
    },
    10205: {
        name: 'Mass Driver',
        description: 'Planetary launch platform with power core and drive coil module slots.',
        color: '#E86344',
    },
    10206: {
        name: 'Mass Catcher',
        description:
            'Planetary receiving platform with storage module slots; catches launched payloads.',
        color: '#4AE898',
    },
    10207: {
        name: 'Station Hub',
        description: 'Orbital command structure. Anchors a player station cluster.',
        color: '#A0B8D0',
    },
    10208: {
        name: 'Workshop',
        description:
            'A station workshop with five independent workers. Visiting ships bring materials and power, and the workshop does the crafting.',
        color: '#B877FF',
    },
    10210: {
        name: 'Roustabout',
        description:
            'A basic starter ship. One engine, one power core, and one open slot to fit as you like.',
        color: '#4AE898',
    },
    10211: {
        name: 'Prospector',
        description: 'A light gathering ship. One engine, one power core, one gathering rig.',
        color: '#4AE898',
    },
    10212: {
        name: 'Tender',
        description:
            'A logistics ship with a shuttle bay for moving cargo between ships and stations.',
        color: '#4AE898',
    },
    10214: {
        name: 'Tug',
        description:
            'A logistics ship with a tractor beam for towing containers from place to place.',
        color: '#4AE898',
    },
    10215: {
        name: 'Porter',
        description:
            'A cargo ship built around a large storage hold. The extra mass makes it slower than a Roustabout.',
        color: '#4AE898',
    },
    10216: {
        name: 'Wrangler',
        description: 'A heavy gathering ship with two gathering rigs, so it mines faster.',
        color: '#4AE898',
    },
    10217: {
        name: 'Dredger',
        description:
            'A gathering ship with its own storage hold, so it can keep mining before it has to offload.',
        color: '#4AE898',
    },

    // === Components (T2) ===
    20001: {
        name: 'Plate',
        description: 'Advanced structural plating reinforced with tier 2 ore.',
        color: '#9BADB8',
    },
    20002: {
        name: 'Frame',
        description:
            'Advanced composite framing reinforced with tier 2 regolith and biomass polymer.',
        color: '#C4A57B',
    },
    20003: {
        name: 'Plasma Cell',
        description: 'Advanced high-energy gaseous storage cell reinforced with tier 2 gas.',
        color: '#E86344',
    },
    20004: {
        name: 'Resonator',
        description: 'Advanced crystalline resonance lattice reinforced with tier 2 crystal.',
        color: '#4ADBFF',
    },
    20005: {
        name: 'Beam',
        description: 'Advanced heavy-duty structural beam reinforced with tier 2 ore.',
        color: '#7B8D9E',
    },
    20006: {
        name: 'Sensor',
        description: 'Advanced crystal-lattice sensing element reinforced with tier 2 crystal.',
        color: '#4ADBFF',
    },
    20007: {
        name: 'Polymer',
        description: 'Advanced pliable biomass-derived polymer reinforced with tier 2 biomass.',
        color: '#5A8B3E',
    },
    20008: {
        name: 'Ceramic',
        description: 'Advanced hardened ceramic reinforced with tier 2 regolith.',
        color: '#C4A57B',
    },
    20009: {
        name: 'Reactor',
        description: 'Advanced gas-pressurized reaction vessel reinforced with tier 2 gas.',
        color: '#B877FF',
    },
    20010: {
        name: 'Resin',
        description: 'Advanced saturated organic binder reinforced with tier 2 biomass.',
        color: '#5A8B3E',
    },

    // === Modules (T2) ===
    20102: {
        name: 'Limpet Bay',
        description: 'Advanced gathering system. Reinforced probes and conduits for deeper yield.',
        color: '#7B8D9E',
    },

    20106: {
        name: 'Tractor Beam',
        description:
            'Advanced haul beam projector reinforced with tier 2 components for greater towing capacity.',
        color: '#4ADBFF',
    },

    // === Entities (packed, T2) ===
    20200: {
        name: 'Container',
        description: 'Advanced cargo container with improved capacity formulas.',
        color: '#9BADB8',
    },
    20210: {
        name: 'Prospector',
        description:
            'Advanced exploration vessel with tiered engine, power core, and limpet bay slots.',
        color: '#4AE898',
    },
    20211: {
        name: 'Hauler',
        description:
            'Advanced towing vessel with tiered engine, generator, and tractor beam slots.',
        color: '#4AE898',
    },
}

export const entityMetadata: Record<number, EntityMetadata> = {
    10201: {moduleSlotLabels: ['Engine', 'Power Core', 'Limpet Bay', 'Shuttle Bay', 'Cargo Hold']},
    10210: {moduleSlotLabels: ['Engine', 'Power Core', 'Utility Bay']},
    10211: {moduleSlotLabels: ['Engine', 'Power Core', 'Limpet Bay']},
    10212: {moduleSlotLabels: ['Engine', 'Power Core', 'Shuttle Bay']},
    10214: {moduleSlotLabels: ['Engine', 'Power Core', 'Tractor Beam']},
    10215: {moduleSlotLabels: ['Engine', 'Power Core', 'Cargo Hold']},
    10216: {moduleSlotLabels: ['Engine', 'Power Core', 'Limpet Bay', 'Limpet Bay']},
    10217: {moduleSlotLabels: ['Engine', 'Power Core', 'Limpet Bay', 'Cargo Hold']},
    10202: {
        moduleSlotLabels: ['Shuttle Bay', 'Cargo Hold', 'Cargo Hold', 'Cargo Hold', 'Cargo Hold'],
    },
    10203: {moduleSlotLabels: ['Power Core', 'Limpet Bay']},
    10204: {moduleSlotLabels: ['Power Core', 'Fabricator']},
    10205: {moduleSlotLabels: ['Power Core', 'Drive Coil']},
    10206: {moduleSlotLabels: ['Cargo Hold', 'Cargo Hold', 'Cargo Hold']},
    20210: {moduleSlotLabels: ['Engine', 'Power Core', 'Limpet Bay', 'Limpet Bay', 'Flex Slot']},
    20211: {moduleSlotLabels: ['Engine', 'Power Core', 'Tractor Beam', 'Tractor Beam']},
}

for (const item of items as Array<{id: number}>) {
    if (!itemMetadata[item.id]) {
        throw new Error(`Missing metadata for item ${item.id}. Add an entry to metadata.ts.`)
    }
}
