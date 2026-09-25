import {getItem} from './catalog'
import {getItemFamily, type ComponentProcess} from './metadata'
import type {RecipeInput} from './recipes-runtime'

export const COMPONENT_PROCESS_ORDER: readonly ComponentProcess[] = ['refined', 'machined']

export function getComponentProcess(itemId: number): ComponentProcess | undefined {
    return getItemFamily(itemId)?.process
}

export interface CompleteComponentSet {
    process: ComponentProcess
    tier: number
    quantity: number | null
}

export function completeComponentSet(inputs: readonly RecipeInput[]): CompleteComponentSet | null {
    const parts = inputs.filter((input) => getComponentProcess(input.itemId) !== undefined)
    if (parts.length !== 5) return null
    const process = getComponentProcess(parts[0].itemId)
    const tier = getItem(parts[0].itemId).tier
    const families = new Set<string>()
    for (const part of parts) {
        const item = getItem(part.itemId)
        if (getComponentProcess(part.itemId) !== process || item.tier !== tier) return null
        families.add(item.family)
    }
    if (!process || families.size !== 5) return null
    const quantity = parts.every((part) => part.quantity === parts[0].quantity)
        ? parts[0].quantity
        : null
    return {process, tier, quantity}
}
