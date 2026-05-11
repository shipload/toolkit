import {UInt64, type UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import type {CoordinatesType} from '../types'
import {Location} from './location'
import {ScheduleAccessor} from '../scheduling/accessor'
import {InventoryAccessor} from './inventory-accessor'
import type {EntityInventory} from './entity-inventory'
import type {PackedModuleInput} from './ship'
import {decodeCraftedItemStats} from '../derivation/crafting'
import {getModuleCapabilityType, MODULE_GATHERER, MODULE_GENERATOR} from '../capabilities/modules'
import {computeGathererCapabilities, computeGeneratorCapabilities} from './ship-deploy'
import {applySlotMultiplier, clampUint16, getSlotAmp, type InstalledModule} from './slot-multiplier'
import type {EntitySlot} from '../data/recipes-runtime'
import {getItem} from '../data/catalog'

export interface ExtractorStateInput {
    id: UInt64Type
    owner: string
    name: string
    coordinates: CoordinatesType | {x: number; y: number; z?: number}
    hullmass?: number
    capacity?: number
    energy?: number
    modules?: PackedModuleInput[]
    schedule?: ServerContract.Types.schedule
    cargo?: ServerContract.Types.cargo_item[]
}

export class Extractor extends ServerContract.Types.entity_info {
    private _sched?: ScheduleAccessor
    private _inv?: InventoryAccessor

    get name(): string {
        return this.entity_name
    }

    get entityClass(): 'planetary' {
        return 'planetary'
    }

    get canDemolish(): boolean {
        return true
    }

    get inv(): InventoryAccessor {
        this._inv ??= new InventoryAccessor(this)
        return this._inv
    }

    get inventory(): EntityInventory[] {
        return this.inv.items
    }

    get sched(): ScheduleAccessor {
        this._sched ??= new ScheduleAccessor(this)
        return this._sched
    }

    get isIdle(): boolean {
        return this.is_idle
    }

    get location(): Location {
        return Location.from(this.coordinates)
    }

    get totalCargoMass(): UInt64 {
        return this.inv.totalMass
    }

    get maxCapacity(): UInt64 {
        return UInt64.from(this.capacity)
    }

    get availableCapacity(): UInt64 {
        const cargo = this.totalCargoMass
        return cargo.gte(this.maxCapacity) ? UInt64.from(0) : this.maxCapacity.subtracting(cargo)
    }

    get isFull(): boolean {
        return this.totalCargoMass.gte(this.maxCapacity)
    }

    get totalMass(): UInt64 {
        const hull = this.hullmass ? UInt64.from(this.hullmass) : UInt64.from(0)
        return hull.adding(this.totalCargoMass)
    }
}

export interface ExtractorCapabilities {
    generator?: {capacity: number; recharge: number}
    gatherer?: {yield: number; drain: number; depth: number; speed: number}
}

export function computeExtractorCapabilities(
    modules: InstalledModule[],
    layout: EntitySlot[]
): ExtractorCapabilities {
    const out: ExtractorCapabilities = {}

    const genModules = modules.filter((m) => getModuleCapabilityType(m.itemId) === MODULE_GENERATOR)
    if (genModules.length > 0) {
        let totalCapacity = 0
        let totalRecharge = 0
        for (const m of genModules) {
            const caps = computeGeneratorCapabilities(decodeCraftedItemStats(m.itemId, m.stats))
            const amp = getSlotAmp(layout, m.slotIndex)
            totalCapacity += applySlotMultiplier(caps.capacity, amp)
            totalRecharge += applySlotMultiplier(caps.recharge, amp)
        }
        out.generator = {
            capacity: clampUint16(totalCapacity),
            recharge: clampUint16(totalRecharge),
        }
    }

    const gathModules = modules.filter((m) => getModuleCapabilityType(m.itemId) === MODULE_GATHERER)
    if (gathModules.length > 0) {
        let totalYield = 0
        let totalDrain = 0
        let maxDepth = 0
        let totalSpeed = 0
        for (const m of gathModules) {
            const tier = getItem(m.itemId).tier
            const caps = computeGathererCapabilities(
                decodeCraftedItemStats(m.itemId, m.stats),
                tier
            )
            const amp = getSlotAmp(layout, m.slotIndex)
            totalYield += applySlotMultiplier(caps.yield, amp)
            totalDrain += caps.drain
            if (caps.depth > maxDepth) maxDepth = caps.depth
            totalSpeed += applySlotMultiplier(caps.speed, amp)
        }
        out.gatherer = {
            yield: clampUint16(totalYield),
            drain: totalDrain,
            depth: maxDepth,
            speed: clampUint16(totalSpeed),
        }
    }

    return out
}
