import {textFields, textRecord} from '../text/registry'

export interface CapabilityAttribute {
    capability: string
    attribute: string
    description: string
}

export interface StatMapping {
    statKey: string
    readonly stat: string
    capability: string
    attribute: string
    sourceKey: string
    readonly source: string
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

const CAPABILITY_LABELS: Record<string, string> = textRecord(
    {
        hull: 'Hull',
        storage: 'Storage',
        movement: 'Movement',
        energy: 'Energy',
        loading: 'Loading',
        gathering: 'Gathering',
        warp: 'Warp',
        crafting: 'Crafting',
        build: 'Build',
        launch: 'Launch',
        hauling: 'Hauling',
        engine: 'Engine',
        generator: 'Generator',
        gatherer: 'Gatherer',
    },
    (key) => `capability.${key}.label`
)

const ATTRIBUTE_LABELS: Record<string, string> = textRecord(
    {
        thrust: 'Thrust',
        drain: 'Drain',
        capacity: 'Capacity',
        recharge: 'Recharge',
        yield: 'Yield',
        depth: 'Depth',
        payload: 'Payload',
        quantity: 'Quantity',
        speed: 'Speed',
        efficiency: 'Efficiency',
        'cargo-capacity': 'Cargo Capacity',
        'energy-capacity': 'Energy Capacity',
        mass: 'Mass',
        range: 'Range',
        quality: 'Quality',
    },
    (key) => `attribute.${key}.label`
)

export function capabilityLabel(capability: string): string {
    return CAPABILITY_LABELS[capability.toLowerCase()] ?? capability
}

export function attributeLabel(attribute: string): string {
    return ATTRIBUTE_LABELS[attribute] ?? attribute
}

const CAPABILITY_ATTRIBUTES: CapabilityAttribute[] = [
    {capability: 'Hull', attribute: 'mass', description: 'Total mass of the hull'},
    {
        capability: 'Storage',
        attribute: 'capacity',
        description: 'Cargo capacity added by hulls and installed Cargo Hold modules',
    },
    {
        capability: 'Storage',
        attribute: 'drain',
        description: 'Travel drain an installed Cargo Hold adds',
    },
    {capability: 'Movement', attribute: 'thrust', description: 'Propulsion force'},
    {
        capability: 'Movement',
        attribute: 'drain',
        description: 'Energy spent per light-year of travel',
    },
    {
        capability: 'Energy',
        attribute: 'capacity',
        description: 'Energy capacity from Power Cores and installed Battery Bank modules',
    },
    {
        capability: 'Energy',
        attribute: 'recharge',
        description: 'Energy restored per minute while recharging',
    },
    {capability: 'Loading', attribute: 'mass', description: 'Mass of the shuttle itself'},
    {capability: 'Loading', attribute: 'thrust', description: 'Shuttle thrust'},
    {
        capability: 'Loading',
        attribute: 'quantity',
        description: 'Cargo items moved per shuttle trip',
    },
    {capability: 'Gathering', attribute: 'yield', description: 'Mass gathered per second'},
    {capability: 'Gathering', attribute: 'drain', description: 'Energy consumed per gather'},
    {capability: 'Gathering', attribute: 'depth', description: 'Deepest stratum a limpet reaches'},
    {capability: 'Warp', attribute: 'range', description: 'Jump distance of one warp'},
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
        description: 'Containers the Tractor Beam can haul at once',
    },
    {
        capability: 'Hauling',
        attribute: 'efficiency',
        description: 'How much less each hauled container slows the ship',
    },
    {
        capability: 'Hauling',
        attribute: 'drain',
        description: 'Travel drain an installed Tractor Beam adds',
    },
]

export const capabilityAttributes: CapabilityAttribute[] = CAPABILITY_ATTRIBUTES.map((row) =>
    textFields(
        {...row},
        {description: row.description},
        () => `capability.${row.capability.toLowerCase()}.${row.attribute}.description`
    )
)

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
