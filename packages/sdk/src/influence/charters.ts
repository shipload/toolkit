import chartersJson from '../data/charters.json'
import {CHARTER_NONE} from './constants'

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
