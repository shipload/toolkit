import type {EntityCapabilities} from '../types/capabilities'
import {ServerContract} from '../contracts'

export interface CrafterCapability {
    crafter: ServerContract.Types.crafter_stats
}

export function capsHasCrafter(caps: EntityCapabilities): boolean {
    return caps.crafter !== undefined
}
