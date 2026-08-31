import {entityDisplayName, moduleDisplayName} from '../nft/description'
import {CHARTER_REGISTRY, type CharterNode} from './charters'
import {CHARTER_EFFECT_REFIT_MODULES, CHARTER_EFFECT_SPAWN_ENTITY, CHARTER_NONE} from './constants'

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

export interface CharterSpawnSignature {
    kind: 'spawn'
    entityLabel: string
}

export interface CharterRefitSignature {
    kind: 'refit'
    targetLabel: string
    moduleLabel: string
    rank: number
    rankCount: number
}

export type CharterSignature = CharterSpawnSignature | CharterRefitSignature

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

export function romanNumeral(rank: number): string {
    return ROMAN[rank - 1] ?? String(rank)
}

function refitSiblings(node: CharterNode): CharterNode[] {
    return CHARTER_REGISTRY.filter(
        (other) =>
            other.effect.kind === CHARTER_EFFECT_REFIT_MODULES &&
            other.effect.targetItemId === node.effect.targetItemId &&
            other.effect.itemId === node.effect.itemId
    )
}

function refitRank(node: CharterNode, siblings: CharterNode[]): number {
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
    if (node.effect.kind === CHARTER_EFFECT_SPAWN_ENTITY) {
        return {kind: 'spawn', entityLabel: entityDisplayName(node.effect.itemId)}
    }
    if (node.effect.kind === CHARTER_EFFECT_REFIT_MODULES) {
        const siblings = refitSiblings(node)
        return {
            kind: 'refit',
            targetLabel: entityDisplayName(node.effect.targetItemId),
            moduleLabel: moduleDisplayName(node.effect.itemId),
            rank: refitRank(node, siblings),
            rankCount: siblings.length,
        }
    }
    return undefined
}

for (const node of CHARTER_REGISTRY) {
    if (node.nodeId === CHARTER_NONE) continue
    if (!charterMetadata[node.nodeId]) {
        throw new Error(
            `Missing charter metadata for node ${node.nodeId}. Add an entry to charter-metadata.ts.`
        )
    }
}
