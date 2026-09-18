import {getBaseCapacityFnName} from '../data/kind-registry'

export const CAPACITY_FN_NAMES = ['ship', 'warehouse', 'depot', 'container', 'workshop'] as const

export type CapacityFnName = (typeof CAPACITY_FN_NAMES)[number]

function isCapacityFnName(name: string): name is CapacityFnName {
    return (CAPACITY_FN_NAMES as readonly string[]).includes(name)
}

export function resolveCapacityFnName(itemId: number): CapacityFnName | undefined {
    const name = getBaseCapacityFnName(itemId)
    if (!name) return undefined
    if (!isCapacityFnName(name)) {
        throw new Error(`unrecognized base capacity function "${name}" for item ${itemId}`)
    }
    return name
}
