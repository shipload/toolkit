import {CHARTER_REGISTRY} from './charters'
import {CHARTER_NONE, CIVIC_DEPOT, CIVIC_DOCK, CIVIC_NEXUS, CIVIC_WORKSHOP} from './constants'
import {compose, defineText, textFields, textRecord} from '../text/registry'

const BUILDING_LABELS: Record<number, string> = textRecord(
    {
        [CIVIC_WORKSHOP]: 'Workshop',
        [CIVIC_NEXUS]: 'Nexus',
        [CIVIC_DOCK]: 'Construction Dock',
        [CIVIC_DEPOT]: 'Depot',
    },
    (building) => `civic.building.${building}.label`
)

defineText({
    'civic.building.unknown': 'Building {id}',
    'charter.unknown': 'Node {id}',
})

export function civicBuildingLabel(building: number): string {
    return BUILDING_LABELS[building] ?? compose('civic.building.unknown', {id: String(building)})
}

export interface CharterMeta {
    name: string
    summary: string
}

const CHARTER_METADATA: Record<number, CharterMeta> = {
    10001: {
        name: 'Communal Workshop',
        summary: 'Gives this world Fabricators any visitor can use for free',
    },
    10100201: {
        name: 'Workshop Tune-Up I',
        summary: 'Speeds up crafting at the Workshop',
    },
    10100202: {
        name: 'Workshop Tune-Up II',
        summary: 'Speeds up crafting at the Workshop',
    },
    10100203: {
        name: 'Workshop Tune-Up III',
        summary: 'Speeds up crafting at the Workshop',
    },
    10100204: {
        name: 'Workshop Tune-Up IV',
        summary: 'Speeds up crafting at the Workshop',
    },
    20001: {
        name: 'Civic Nexus',
        summary: 'Raises the world to Tier II and lets players wrap items here',
    },
    30100001: {
        name: 'Construction Dock',
        summary: 'Upgrades ships for any player at this world',
    },
    30100301: {
        name: 'Dock Tune-Up I',
        summary: 'Speeds up ship upgrades at the Construction Dock',
    },
    30100302: {
        name: 'Dock Tune-Up II',
        summary: 'Speeds up ship upgrades at the Construction Dock',
    },
    30100303: {
        name: 'Dock Tune-Up III',
        summary: 'Speeds up ship upgrades at the Construction Dock',
    },
    30100304: {
        name: 'Dock Tune-Up IV',
        summary: 'Speeds up ship upgrades at the Construction Dock',
    },
    40100001: {
        name: 'Public Depot',
        summary: 'Gives every player storage at this world',
    },
    40100101: {
        name: 'Depot Cargo Hold I',
        summary: 'Raises what each player can keep at the Depot',
    },
    40100102: {
        name: 'Depot Cargo Hold II',
        summary: 'Raises what each player can keep at the Depot',
    },
    40100103: {
        name: 'Depot Cargo Hold III',
        summary: 'Raises what each player can keep at the Depot',
    },
    40100104: {
        name: 'Depot Cargo Hold IV',
        summary: 'Raises what each player can keep at the Depot',
    },
    40100401: {
        name: 'Depot Shuttle Bay I',
        summary: 'Moves cargo into and out of the Depot faster',
    },
    40100402: {
        name: 'Depot Shuttle Bay II',
        summary: 'Moves cargo into and out of the Depot faster',
    },
    40100403: {
        name: 'Depot Shuttle Bay III',
        summary: 'Moves cargo into and out of the Depot faster',
    },
    40100404: {
        name: 'Depot Shuttle Bay IV',
        summary: 'Moves cargo into and out of the Depot faster',
    },
}

export const charterMetadata: Record<number, CharterMeta> = Object.fromEntries(
    Object.entries(CHARTER_METADATA).map(([nodeId, meta]) => [
        nodeId,
        textFields(
            {...meta},
            {name: meta.name, summary: meta.summary},
            (field) => `charter.${nodeId}.${field}`
        ),
    ])
)

export function charterName(nodeId: number): string {
    return charterMetadata[nodeId]?.name ?? compose('charter.unknown', {id: String(nodeId)})
}

export function charterSummary(nodeId: number): string {
    return charterMetadata[nodeId]?.summary ?? ''
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

export function romanNumeral(rank: number): string {
    return ROMAN[rank - 1] ?? String(rank)
}

for (const node of CHARTER_REGISTRY) {
    if (node.nodeId === CHARTER_NONE) continue
    if (!charterMetadata[node.nodeId]) {
        throw new Error(
            `Missing charter metadata for node ${node.nodeId}. Add an entry to charter-metadata.ts.`
        )
    }
}
