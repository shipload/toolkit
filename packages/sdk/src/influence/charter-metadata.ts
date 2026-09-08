import {CHARTER_REGISTRY, type CharterGrant, type CharterNode} from './charters'
import {
    CHARTER_NONE,
    CIVIC_DEPOT,
    CIVIC_DOCK,
    CIVIC_GRANT_LEVEL_GATE,
    CIVIC_GRANT_RUNG,
    CIVIC_GRANT_WORKER,
    CIVIC_NEXUS,
    CIVIC_STAT_BUILD_SPEED,
    CIVIC_STAT_CRAFT_SPEED,
    CIVIC_STAT_STORAGE_CAPACITY,
    CIVIC_STAT_TRANSFER_SPEED,
    CIVIC_WORKSHOP,
} from './constants'

const BUILDING_LABELS: Record<number, string> = {
    [CIVIC_WORKSHOP]: 'Workshop',
    [CIVIC_NEXUS]: 'Nexus',
    [CIVIC_DOCK]: 'Construction Dock',
    [CIVIC_DEPOT]: 'Depot',
}

const STAT_LABELS: Record<number, string> = {
    [CIVIC_STAT_CRAFT_SPEED]: 'crafting speed',
    [CIVIC_STAT_BUILD_SPEED]: 'build speed',
    [CIVIC_STAT_TRANSFER_SPEED]: 'transfer speed',
    [CIVIC_STAT_STORAGE_CAPACITY]: 'storage capacity',
}

export function civicBuildingLabel(building: number): string {
    return BUILDING_LABELS[building] ?? `Building ${building}`
}

export function civicStatLabel(stat: number): string {
    return STAT_LABELS[stat] ?? `Stat ${stat}`
}

export interface CharterMeta {
    name: string
    summary: string
}

export const charterMetadata: Record<number, CharterMeta> = {
    1: {name: 'Communal Workshop', summary: 'Shared crafting for anyone at this world'},
    2: {name: 'Civic Nexus', summary: 'Wrap items for trade and unwrap them here'},
    3: {name: 'Construction Dock', summary: 'Ships queue here for upgrades'},
    4: {name: 'Workshop tune-up', summary: "Raises the Workshop's Fabricator stats"},
    5: {name: 'Dock tune-up', summary: "Raises the Dock's Assembly Arm stats"},
    6: {name: 'Public Depot', summary: 'Storage at this world for every player'},
    7: {
        name: 'Depot Cargo Hold I',
        summary: 'Raises what each player can keep at the depot',
    },
    8: {
        name: 'Depot Cargo Hold II',
        summary: 'Raises what each player can keep at the depot',
    },
    9: {
        name: 'Depot Cargo Hold III',
        summary: 'Raises what each player can keep at the depot',
    },
    10: {
        name: 'Depot Cargo Hold IV',
        summary: 'Raises what each player can keep at the depot',
    },
    11: {
        name: 'Depot Shuttle Bay I',
        summary: 'Moves cargo in and out of the depot faster',
    },
    12: {
        name: 'Depot Shuttle Bay II',
        summary: 'Moves cargo in and out of the depot faster',
    },
    13: {
        name: 'Depot Shuttle Bay III',
        summary: 'Moves cargo in and out of the depot faster',
    },
    14: {
        name: 'Depot Shuttle Bay IV',
        summary: 'Moves cargo in and out of the depot faster',
    },
}

export function charterName(nodeId: number): string {
    return charterMetadata[nodeId]?.name ?? `Charter ${nodeId}`
}

export function charterSummary(nodeId: number): string {
    return charterMetadata[nodeId]?.summary ?? ''
}

export interface CharterGateSignature {
    kind: 'gate'
    buildingLabel: string
    level: number
}

export interface CharterWorkerSignature {
    kind: 'worker'
    buildingLabel: string
    count: number
    rank: number
    rankCount: number
}

export interface CharterRungSignature {
    kind: 'rung'
    buildingLabel: string
    statLabel: string
    rank: number
    rankCount: number
}

export type CharterSignature = CharterGateSignature | CharterWorkerSignature | CharterRungSignature

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

export function romanNumeral(rank: number): string {
    return ROMAN[rank - 1] ?? String(rank)
}

function headlineGrant(node: CharterNode): CharterGrant | undefined {
    return (
        node.grants.find((grant) => grant.kind === CIVIC_GRANT_LEVEL_GATE) ??
        node.grants.find((grant) => grant.kind === CIVIC_GRANT_WORKER) ??
        node.grants.find((grant) => grant.kind === CIVIC_GRANT_RUNG)
    )
}

function headlineSiblings(headline: CharterGrant): CharterNode[] {
    return CHARTER_REGISTRY.filter((other) => {
        const grant = headlineGrant(other)
        return (
            grant !== undefined &&
            grant.kind === headline.kind &&
            grant.building === headline.building &&
            grant.stat === headline.stat
        )
    })
}

function rungRank(node: CharterNode, siblings: CharterNode[]): number {
    const byId = new Map(siblings.map((sibling) => [sibling.nodeId, sibling]))
    const seen = new Set<number>([node.nodeId])
    let current: CharterNode | undefined = node
    let rank = 1
    while (current) {
        const previousId = current.prereqs.find((id) => byId.has(id) && !seen.has(id))
        if (previousId === undefined) return rank
        seen.add(previousId)
        current = byId.get(previousId)
        rank += 1
    }
    return rank
}

export function charterSignature(node: CharterNode): CharterSignature | undefined {
    const grant = headlineGrant(node)
    if (!grant) return undefined
    if (grant.kind === CIVIC_GRANT_LEVEL_GATE) {
        return {
            kind: 'gate',
            buildingLabel: civicBuildingLabel(grant.building),
            level: grant.value,
        }
    }
    const siblings = headlineSiblings(grant)
    if (grant.kind === CIVIC_GRANT_WORKER) {
        return {
            kind: 'worker',
            buildingLabel: civicBuildingLabel(grant.building),
            count: grant.value,
            rank: rungRank(node, siblings),
            rankCount: siblings.length,
        }
    }
    return {
        kind: 'rung',
        buildingLabel: civicBuildingLabel(grant.building),
        statLabel: civicStatLabel(grant.stat),
        rank: rungRank(node, siblings),
        rankCount: siblings.length,
    }
}

for (const node of CHARTER_REGISTRY) {
    if (node.nodeId === CHARTER_NONE) continue
    if (!charterMetadata[node.nodeId]) {
        throw new Error(
            `Missing charter metadata for node ${node.nodeId}. Add an entry to charter-metadata.ts.`
        )
    }
}
