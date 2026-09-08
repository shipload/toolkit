import chartersJson from '../data/charters.json'
import {
    CHARTER_NONE,
    CIVIC_GRANT_LEVEL_GATE,
    CIVIC_GRANT_RUNG,
    CIVIC_GRANT_WORKER,
} from './constants'

export interface CharterGrant {
    kind: number
    building: number
    stat: number
    value: number
}

export interface CharterNode {
    nodeId: number
    cost: bigint
    prereqs: number[]
    grants: CharterGrant[]
    exclusionGroup: number
    repeatCap: number
}

export const CHARTER_REGISTRY: CharterNode[] = chartersJson.nodes.map((node) => ({
    nodeId: node.nodeId,
    cost: BigInt(node.cost),
    prereqs: [...node.prereqs],
    grants: node.grants.map((grant) => ({...grant})),
    exclusionGroup: node.exclusionGroup,
    repeatCap: node.repeatCap,
}))

export function charterNode(nodeId: number): CharterNode | undefined {
    if (nodeId === CHARTER_NONE) return undefined
    return CHARTER_REGISTRY.find((n) => n.nodeId === nodeId)
}

export type CharterIneligibility = 'already-taken' | 'prereq-missing'

export const CHARTER_INELIGIBILITY_MESSAGES: Record<CharterIneligibility, string> = {
    'already-taken': 'charter is already completed at this world',
    'prereq-missing': 'charter prerequisites are not completed',
}

export interface BuiltCharter {
    nodeId: number
    entityId: bigint
}

export interface CharterWorld {
    built: BuiltCharter[]
    entityExists?: (entityId: bigint) => boolean
}

function builtCharter(world: CharterWorld, nodeId: number): BuiltCharter | undefined {
    return world.built.find((row) => row.nodeId === nodeId)
}

export function charterGateNodeFor(building: number, level: number = 1): CharterNode | undefined {
    return CHARTER_REGISTRY.find((node) =>
        node.grants.some(
            (grant) =>
                grant.kind === CIVIC_GRANT_LEVEL_GATE &&
                grant.building === building &&
                grant.value === level
        )
    )
}

export function charterBuildingEntity(world: CharterWorld, building: number): bigint {
    const gate = charterGateNodeFor(building)
    if (!gate) return 0n
    const record = builtCharter(world, gate.nodeId)
    if (!record) return 0n
    if (world.entityExists && !world.entityExists(record.entityId)) return 0n
    return record.entityId
}

export function charterRungValue(world: CharterWorld, building: number, stat: number): number {
    let total = 0
    for (const node of CHARTER_REGISTRY) {
        if (builtCharter(world, node.nodeId) === undefined) continue
        for (const grant of node.grants) {
            if (grant.kind !== CIVIC_GRANT_RUNG) continue
            if (grant.building !== building || grant.stat !== stat) continue
            total += grant.value
        }
    }
    return total
}

export function charterWorkerCount(world: CharterWorld, building: number): number {
    let total = 0
    for (const node of CHARTER_REGISTRY) {
        if (builtCharter(world, node.nodeId) === undefined) continue
        for (const grant of node.grants) {
            if (grant.kind !== CIVIC_GRANT_WORKER) continue
            if (grant.building !== building) continue
            total += grant.value
        }
    }
    return total
}

export function charterPrereqsMet(world: CharterWorld, node: CharterNode): boolean {
    return node.prereqs.every(
        (prereq) => prereq === CHARTER_NONE || builtCharter(world, prereq) !== undefined
    )
}

export function charterIneligible(
    world: CharterWorld,
    node: CharterNode
): CharterIneligibility | undefined {
    if (builtCharter(world, node.nodeId) !== undefined) return 'already-taken'
    if (!charterPrereqsMet(world, node)) return 'prereq-missing'
    return undefined
}

export function charterEligible(world: CharterWorld, node: CharterNode): boolean {
    return charterIneligible(world, node) === undefined
}

export function eligibleCharters(world: CharterWorld): CharterNode[] {
    return CHARTER_REGISTRY.filter((node) => charterEligible(world, node))
}

export function charterSingletonMandate(world: CharterWorld): number {
    let only = CHARTER_NONE
    for (const node of CHARTER_REGISTRY) {
        if (!charterEligible(world, node)) continue
        if (only !== CHARTER_NONE) return CHARTER_NONE
        only = node.nodeId
    }
    return only
}

export function charterEligibleChained(
    world: CharterWorld,
    node: CharterNode,
    seated: number[]
): boolean {
    if (builtCharter(world, node.nodeId) !== undefined || seated.includes(node.nodeId)) return false
    for (const prereq of node.prereqs) {
        if (prereq === CHARTER_NONE) continue
        if (builtCharter(world, prereq) === undefined && !seated.includes(prereq)) return false
    }
    return true
}
