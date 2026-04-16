export interface CapabilityAttribute {
    capability: string
    attribute: string
    description: string
}

export interface StatMapping {
    stat: string
    capability: string
    attribute: string
    rationale: string
}

export const capabilityNames: string[] = [
    'Hull',
    'Storage',
    'Movement',
    'Energy',
    'Loader',
    'Gathering',
    'Warp',
    'Manufacturing',
    'Launch',
    'Hauler',
]

export const capabilityAttributes: CapabilityAttribute[] = [
    {capability: 'Hull', attribute: 'mass', description: 'Total mass of the hull'},
    {capability: 'Storage', attribute: 'capacity', description: 'Maximum mass that can be stored'},
    {capability: 'Movement', attribute: 'thrust', description: 'Propulsion force'},
    {capability: 'Movement', attribute: 'drain', description: 'Energy consumed per movement'},
    {capability: 'Energy', attribute: 'capacity', description: 'Maximum energy storage'},
    {capability: 'Energy', attribute: 'recharge', description: 'Energy regeneration rate'},
    {capability: 'Loader', attribute: 'mass', description: 'Weight of the loader unit itself'},
    {capability: 'Loader', attribute: 'thrust', description: 'Loading speed/force'},
    {capability: 'Gathering', attribute: 'yield', description: 'Mass gathered per second'},
    {capability: 'Gathering', attribute: 'drain', description: 'Energy consumed per gather'},
    {capability: 'Gathering', attribute: 'depth', description: 'Maximum gather depth'},
    {capability: 'Gathering', attribute: 'speed', description: 'Gathering speed/penetration'},
    {capability: 'Warp', attribute: 'range', description: 'Maximum warp distance'},
    {capability: 'Manufacturing', attribute: 'speed', description: 'Crafting time per item'},
    {
        capability: 'Manufacturing',
        attribute: 'drain',
        description: 'Energy consumed per second while crafting',
    },
    {capability: 'Manufacturing', attribute: 'quality', description: 'Modifier on output quality'},
    {capability: 'Launch', attribute: 'range', description: 'Maximum launch distance'},
    {capability: 'Launch', attribute: 'capacity', description: 'Maximum mass per launch'},
    {capability: 'Launch', attribute: 'drain', description: 'Energy consumed per launch'},
    {
        capability: 'Hauler',
        attribute: 'capacity',
        description: 'Number of targets the haul beam can lock onto simultaneously',
    },
    {
        capability: 'Hauler',
        attribute: 'efficiency',
        description: 'Thrust penalty reduction per hauled target',
    },
    {
        capability: 'Hauler',
        attribute: 'drain',
        description: 'Energy consumed per target during haul-beam operation',
    },
]

export const statMappings: StatMapping[] = [
    {
        stat: 'Strength',
        capability: 'Gathering',
        attribute: 'yield',
        rationale: 'Raw mechanical force drives faster gathering',
    },
    {
        stat: 'Strength',
        capability: 'Storage',
        attribute: 'capacity',
        rationale: 'Stronger walls hold more capacity per mass',
    },
    {
        stat: 'Strength',
        capability: 'Launch',
        attribute: 'capacity',
        rationale: 'Stronger housing handles larger launch loads',
    },
    {
        stat: 'Tolerance',
        capability: 'Movement',
        attribute: 'thrust',
        rationale: 'Engine components that tolerate more can push harder',
    },
    {
        stat: 'Tolerance',
        capability: 'Energy',
        attribute: 'recharge',
        rationale: 'Generator housing withstands stress for faster recharge',
    },
    {
        stat: 'Tolerance',
        capability: 'Gathering',
        attribute: 'depth',
        rationale: 'Housing withstands pressure/heat at extreme depths',
    },
    {
        stat: 'Tolerance',
        capability: 'Warp',
        attribute: 'range',
        rationale: 'Warp drive housing withstands extreme forces',
    },
    {
        stat: 'Density',
        capability: 'Hull',
        attribute: 'mass',
        rationale: 'Lighter metal = lighter hull',
    },
    {
        stat: 'Density',
        capability: 'Loader',
        attribute: 'mass',
        rationale: 'Lighter metal = lighter loader units',
    },
    {
        stat: 'Density',
        capability: 'Movement',
        attribute: 'drain',
        rationale: 'Lighter components require less energy to move',
    },
    {
        stat: 'Conductivity',
        capability: 'Movement',
        attribute: 'drain',
        rationale: 'Efficient energy transfer reduces movement energy cost',
    },
    {
        stat: 'Conductivity',
        capability: 'Gathering',
        attribute: 'drain',
        rationale: 'Efficient energy transfer reduces gathering energy cost',
    },
    {
        stat: 'Conductivity',
        capability: 'Manufacturing',
        attribute: 'drain',
        rationale: 'Efficient energy transfer reduces manufacturing energy cost',
    },
    {
        stat: 'Conductivity',
        capability: 'Energy',
        attribute: 'recharge',
        rationale: 'Better conductivity speeds energy flow during recharge',
    },
    {
        stat: 'Ductility',
        capability: 'Manufacturing',
        attribute: 'quality',
        rationale: 'Precise shaping enables tighter manufacturing tolerances',
    },
    {
        stat: 'Ductility',
        capability: 'Gathering',
        attribute: 'yield',
        rationale: 'Precisely shaped conduit components gather faster',
    },
    {
        stat: 'Ductility',
        capability: 'Storage',
        attribute: 'capacity',
        rationale: 'Precision-formed container walls maximize volume',
    },
    {
        stat: 'Ductility',
        capability: 'Loader',
        attribute: 'mass',
        rationale: 'Precision-formed precious metal reduces loader unit mass',
    },
    {
        stat: 'Reflectivity',
        capability: 'Gathering',
        attribute: 'depth',
        rationale: 'Reflective heat shielding protects equipment at depth',
    },
    {
        stat: 'Reflectivity',
        capability: 'Launch',
        attribute: 'range',
        rationale: 'Reflective surfaces focus electromagnetic launch energy',
    },
    {
        stat: 'Volatility',
        capability: 'Gathering',
        attribute: 'yield',
        rationale: 'Energy release powers faster gathering',
    },
    {
        stat: 'Volatility',
        capability: 'Movement',
        attribute: 'thrust',
        rationale: 'Energy release drives propulsion force',
    },
    {
        stat: 'Volatility',
        capability: 'Loader',
        attribute: 'thrust',
        rationale: 'Energy release powers loader motors',
    },
    {
        stat: 'Volatility',
        capability: 'Launch',
        attribute: 'capacity',
        rationale: 'Energy release enables launching heavier payloads',
    },
    {
        stat: 'Reactivity',
        capability: 'Manufacturing',
        attribute: 'speed',
        rationale: 'Reactive gases accelerate chemical/thermal processing',
    },
    {
        stat: 'Reactivity',
        capability: 'Gathering',
        attribute: 'speed',
        rationale: 'Reactive gases manage heat/friction during gathering',
    },
    {
        stat: 'Reactivity',
        capability: 'Launch',
        attribute: 'drain',
        rationale: 'Reactive gas medium reduces electromagnetic resistance',
    },
    {
        stat: 'Thermal',
        capability: 'Manufacturing',
        attribute: 'quality',
        rationale: 'Precise thermal control during fabrication',
    },
    {
        stat: 'Thermal',
        capability: 'Gathering',
        attribute: 'drain',
        rationale: 'Thermal management reduces energy waste during gathering',
    },
    {
        stat: 'Thermal',
        capability: 'Energy',
        attribute: 'capacity',
        rationale: 'Thermal management enables denser energy storage',
    },
    {
        stat: 'Resonance',
        capability: 'Energy',
        attribute: 'capacity',
        rationale: 'Resonating crystals store energy in fields',
    },
    {
        stat: 'Resonance',
        capability: 'Warp',
        attribute: 'range',
        rationale: 'Resonant crystals amplify warp field projection',
    },
    {
        stat: 'Resonance',
        capability: 'Launch',
        attribute: 'range',
        rationale: 'Resonant crystals focus electromagnetic launch field',
    },
    {
        stat: 'Resonance',
        capability: 'Launch',
        attribute: 'capacity',
        rationale: 'Stronger resonant field launches heavier payloads',
    },
    {
        stat: 'Hardness',
        capability: 'Manufacturing',
        attribute: 'speed',
        rationale: 'Hard tooling surfaces cut and shape materials faster',
    },
    {
        stat: 'Hardness',
        capability: 'Launch',
        attribute: 'drain',
        rationale: 'Hard rail surfaces reduce friction, less energy wasted',
    },
    {
        stat: 'Clarity',
        capability: 'Energy',
        attribute: 'recharge',
        rationale: 'Flawless crystals enable smoother energy flow during recharge',
    },
    {
        stat: 'Clarity',
        capability: 'Manufacturing',
        attribute: 'quality',
        rationale: 'Precision optics for calibration during fabrication',
    },
    {
        stat: 'Clarity',
        capability: 'Manufacturing',
        attribute: 'drain',
        rationale: 'Precision computing optimizes energy routing in factory',
    },
    {
        stat: 'Plasticity',
        capability: 'Manufacturing',
        attribute: 'speed',
        rationale: 'Easily reshaped materials speed up processing',
    },
    {
        stat: 'Plasticity',
        capability: 'Movement',
        attribute: 'thrust',
        rationale: 'Flexible polymer seals reduce friction in propulsion',
    },
    {
        stat: 'Plasticity',
        capability: 'Loader',
        attribute: 'thrust',
        rationale: 'Flexible joints improve loader force transfer',
    },
    {
        stat: 'Insulation',
        capability: 'Movement',
        attribute: 'drain',
        rationale: 'Better insulation reduces energy loss during movement',
    },
    {
        stat: 'Insulation',
        capability: 'Gathering',
        attribute: 'drain',
        rationale: 'Better insulation reduces energy loss during gathering',
    },
    {
        stat: 'Insulation',
        capability: 'Manufacturing',
        attribute: 'drain',
        rationale: 'Better insulation reduces energy loss during manufacturing',
    },
    {
        stat: 'Insulation',
        capability: 'Launch',
        attribute: 'drain',
        rationale: 'Better insulation reduces energy loss during launch',
    },
    {
        stat: 'Purity',
        capability: 'Storage',
        attribute: 'capacity',
        rationale: 'Purer composites make better containers',
    },
    {
        stat: 'Purity',
        capability: 'Gathering',
        attribute: 'speed',
        rationale: 'Purer bio-lubricants reduce friction during gathering',
    },
    {
        stat: 'Purity',
        capability: 'Energy',
        attribute: 'capacity',
        rationale: 'Purer organic electrolytes store more charge',
    },
    {
        stat: 'Resonance',
        capability: 'Hauler',
        attribute: 'capacity',
        rationale:
            'Resonant field strength determines how many targets the haul beam can lock onto simultaneously.',
    },
    {
        stat: 'Conductivity',
        capability: 'Hauler',
        attribute: 'efficiency',
        rationale: 'Energy-transfer efficiency reduces the thrust penalty from each hauled target.',
    },
    {
        stat: 'Clarity',
        capability: 'Hauler',
        attribute: 'drain',
        rationale:
            'Clarity-focused energy routing reduces per-target drain during haul-beam operation.',
    },
]

const invertedAttributes = new Set(['drain', 'mass'])

export function isInvertedAttribute(attribute: string): boolean {
    return invertedAttributes.has(attribute)
}

export function getCapabilityAttributes(capability?: string): CapabilityAttribute[] {
    if (capability) {
        return capabilityAttributes.filter((a) => a.capability === capability)
    }
    return capabilityAttributes
}

export function getStatMappings(): StatMapping[] {
    return statMappings
}

export function getStatMappingsForStat(stat: string): StatMapping[] {
    return statMappings.filter((m) => m.stat === stat)
}

export function getStatMappingsForCapability(capability: string): StatMapping[] {
    return statMappings.filter((m) => m.capability === capability)
}
