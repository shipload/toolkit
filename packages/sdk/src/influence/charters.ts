import chartersJson from '../data/charters.json'
import {CHARTER_EFFECT_REFIT_MODULES, CHARTER_EFFECT_SPAWN_ENTITY, CHARTER_NONE} from './constants'

export interface CharterEffect {
    kind: number
    itemId: number
    targetItemId: number
    slotMask: number
    stat: number
}

export interface CharterNode {
    nodeId: number
    cost: bigint
    prereqs: number[]
    effect: CharterEffect
}

export const CHARTER_REGISTRY: CharterNode[] = chartersJson.nodes.map((node) => ({
    nodeId: node.nodeId,
    cost: BigInt(node.cost),
    prereqs: [...node.prereqs],
    effect: {...node.effect},
}))

export function charterNode(nodeId: number): CharterNode | undefined {
    if (nodeId === CHARTER_NONE) return undefined
    return CHARTER_REGISTRY.find((n) => n.nodeId === nodeId)
}

export type CharterIneligibility = 'already-taken' | 'prereq-missing' | 'refit-target-missing'

export const CHARTER_INELIGIBILITY_MESSAGES: Record<CharterIneligibility, string> = {
    'already-taken': 'charter is already completed at this world',
    'prereq-missing': 'charter prerequisites are not completed',
    'refit-target-missing': 'charter refit target not found at this world',
}

export interface BuiltCharter {
    nodeId: number
    entityId: bigint
}

export interface CharterWorld {
    built: BuiltCharter[]
    entityExists?: (entityId: bigint) => boolean
}

export interface ChosenCharter {
    chosen: number
    chosenEpoch: number
}

function builtCharter(world: CharterWorld, nodeId: number): BuiltCharter | undefined {
    return world.built.find((row) => row.nodeId === nodeId)
}

export function charterSpawnNodeFor(targetItemId: number): CharterNode | undefined {
    return CHARTER_REGISTRY.find(
        (node) =>
            node.effect.kind === CHARTER_EFFECT_SPAWN_ENTITY && node.effect.itemId === targetItemId
    )
}

export function charterPrereqsMet(world: CharterWorld, node: CharterNode): boolean {
    return node.prereqs.every(
        (prereq) => prereq === CHARTER_NONE || builtCharter(world, prereq) !== undefined
    )
}

export function charterEffectTargetEntity(world: CharterWorld, node: CharterNode): bigint {
    const spawn = charterSpawnNodeFor(node.effect.targetItemId)
    if (!spawn) return 0n
    const record = builtCharter(world, spawn.nodeId)
    if (!record) return 0n
    if (world.entityExists && !world.entityExists(record.entityId)) return 0n
    return record.entityId
}

export function charterEffectTargetPresent(world: CharterWorld, node: CharterNode): boolean {
    if (node.effect.kind !== CHARTER_EFFECT_REFIT_MODULES) return true
    return charterEffectTargetEntity(world, node) !== 0n
}

export function charterIneligible(
    world: CharterWorld,
    node: CharterNode
): CharterIneligibility | undefined {
    if (builtCharter(world, node.nodeId) !== undefined) return 'already-taken'
    if (!charterPrereqsMet(world, node)) return 'prereq-missing'
    if (!charterEffectTargetPresent(world, node)) return 'refit-target-missing'
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

export function effectiveMandate(
    stored: ChosenCharter,
    world: CharterWorld,
    epoch: number
): number {
    if (stored.chosen !== CHARTER_NONE && stored.chosenEpoch === epoch) return stored.chosen
    return charterSingletonMandate(world)
}
