import {ITEM_WORKSHOP_T1_PACKED} from '../data/item-ids'
import {
    CHARTER_EFFECT_SPAWN_ENTITY,
    CHARTER_NONE,
    CHARTER_WORKSHOP,
    CHARTER_WORKSHOP_COST,
} from './constants'

export interface CharterNode {
    nodeId: number
    cost: bigint
    prereqs: number[]
    effect: {kind: number; itemId: number}
}

export const CHARTER_REGISTRY: CharterNode[] = [
    {
        nodeId: CHARTER_WORKSHOP,
        cost: CHARTER_WORKSHOP_COST,
        prereqs: [],
        effect: {kind: CHARTER_EFFECT_SPAWN_ENTITY, itemId: ITEM_WORKSHOP_T1_PACKED},
    },
]

export function charterNode(nodeId: number): CharterNode | undefined {
    if (nodeId === CHARTER_NONE) return undefined
    return CHARTER_REGISTRY.find((n) => n.nodeId === nodeId)
}
