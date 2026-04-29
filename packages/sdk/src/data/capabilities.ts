export interface CapabilityAttribute {
    capability: string
    attribute: string
    description: string
}

export interface StatMapping {
    stat: string
    capability: string
    attribute: string
}

export const capabilityNames: string[] = [
    'Hull',
    'Storage',
    'Movement',
    'Energy',
    'Loader',
    'Gathering',
    'Warp',
    'Crafter',
    'Launch',
    'Hauler',
]

export const capabilityAttributes: CapabilityAttribute[] = [
    {capability: 'Hull', attribute: 'mass', description: 'Total mass of the hull'},
    {capability: 'Storage', attribute: 'capacity', description: 'Maximum mass that can be stored'},
    {
        capability: 'Storage',
        attribute: 'bonus',
        description: 'Capacity bonus added by an installed Storage module',
    },
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
    {capability: 'Crafter', attribute: 'speed', description: 'Crafting time per item'},
    {
        capability: 'Crafter',
        attribute: 'drain',
        description: 'Energy consumed per second while crafting',
    },
    {capability: 'Crafter', attribute: 'quality', description: 'Modifier on output quality'},
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
