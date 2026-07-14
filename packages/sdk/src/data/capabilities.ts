export interface CapabilityAttribute {
    capability: string
    attribute: string
    description: string
}

export interface StatMapping {
    stat: string
    capability: string
    attribute: string
    source: string // producing module/role, always present
}

export interface CapabilityAttributeRow {
    capability: string
    attribute: string
    description: string
    source?: string // producing module/role; absent when no formula-derived producer exists
}

export const capabilityNames: string[] = [
    'Hull',
    'Storage',
    'Movement',
    'Energy',
    'Loading',
    'Gathering',
    'Warp',
    'Crafting',
    'Build',
    'Launch',
    'Hauling',
]

export const capabilityAttributes: CapabilityAttribute[] = [
    {capability: 'Hull', attribute: 'mass', description: 'Total mass of the hull'},
    {
        capability: 'Storage',
        attribute: 'capacity',
        description: 'Cargo capacity added by hulls and installed Cargo Hold modules',
    },
    {
        capability: 'Storage',
        attribute: 'drain',
        description: 'Fixed normal-travel drain contributed by an installed Cargo Hold',
    },
    {capability: 'Movement', attribute: 'thrust', description: 'Propulsion force'},
    {
        capability: 'Movement',
        attribute: 'drain',
        description: 'Total installed energy consumed per tile of normal travel',
    },
    {
        capability: 'Energy',
        attribute: 'capacity',
        description: 'Energy capacity from Power Cores and installed Battery Bank modules',
    },
    {capability: 'Energy', attribute: 'recharge', description: 'Energy regeneration rate'},
    {capability: 'Loading', attribute: 'mass', description: 'Weight of the loader unit itself'},
    {capability: 'Loading', attribute: 'thrust', description: 'Loading speed/force'},
    {
        capability: 'Loading',
        attribute: 'quantity',
        description: 'Number of cargo items moved per load operation',
    },
    {capability: 'Gathering', attribute: 'yield', description: 'Mass gathered per second'},
    {capability: 'Gathering', attribute: 'drain', description: 'Energy consumed per gather'},
    {capability: 'Gathering', attribute: 'depth', description: 'Maximum gather depth'},
    {capability: 'Warp', attribute: 'range', description: 'Maximum warp distance'},
    {capability: 'Crafting', attribute: 'speed', description: 'Crafting time per item'},
    {
        capability: 'Crafting',
        attribute: 'drain',
        description: 'Energy consumed per second while crafting',
    },
    {capability: 'Crafting', attribute: 'quality', description: 'Modifier on output quality'},
    {capability: 'Build', attribute: 'speed', description: 'Build progress per second'},
    {
        capability: 'Build',
        attribute: 'drain',
        description: 'Energy consumed per second while building',
    },
    {capability: 'Launch', attribute: 'range', description: 'Maximum launch distance'},
    {capability: 'Launch', attribute: 'capacity', description: 'Maximum mass per launch'},
    {capability: 'Launch', attribute: 'drain', description: 'Energy consumed per launch'},
    {
        capability: 'Hauling',
        attribute: 'capacity',
        description: 'Number of targets the haul beam can lock onto simultaneously',
    },
    {
        capability: 'Hauling',
        attribute: 'efficiency',
        description: 'Thrust penalty reduction per hauled target',
    },
    {
        capability: 'Hauling',
        attribute: 'drain',
        description: 'Fixed normal-travel drain contributed by an installed Tractor Beam',
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
