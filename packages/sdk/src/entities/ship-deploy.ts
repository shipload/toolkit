import {decodeCraftedItemStats} from '../derivation/crafting'
import {
    getModuleCapabilityType,
    MODULE_CRAFTER,
    MODULE_ENGINE,
    MODULE_GATHERER,
    MODULE_GENERATOR,
    MODULE_HAULER,
    MODULE_LOADER,
} from '../capabilities/modules'
import {getItem} from '../data/catalog'
import type {EntitySlot} from '../data/recipes-runtime'
import {applySlotMultiplier, clampUint16, getSlotAmp, type InstalledModule} from './slot-multiplier'
import {
    computeEngineCapabilities,
    computeGeneratorCapabilities,
    computeGathererCapabilities,
    computeHaulerCapabilities,
    computeLoaderCapabilities,
    computeCrafterCapabilities,
} from '../derivation/capabilities'

export type {InstalledModule}

export {
    computeShipHullCapabilities,
    computeEngineCapabilities,
    computeGeneratorCapabilities,
    computeGathererCapabilities,
    computeLoaderCapabilities,
    computeCrafterCapabilities,
    computeHaulerCapabilities,
    computeStorageCapabilities,
    computeWarehouseHullCapabilities,
    type GathererDepthParams,
    GATHERER_DEPTH_TABLE,
    GATHERER_DEPTH_MAX_TIER,
    gathererDepthForTier,
} from '../derivation/capabilities'

export interface ShipCapabilities {
    engines?: {thrust: number; drain: number}
    generator?: {capacity: number; recharge: number}
    gatherer?: {yield: number; drain: number; depth: number; speed: number}
    hauler?: {capacity: number; efficiency: number; drain: number}
    loaders?: {mass: number; thrust: number; quantity: number}
    crafter?: {speed: number; drain: number}
}

export function computeShipCapabilities(
    modules: InstalledModule[],
    layout: EntitySlot[]
): ShipCapabilities {
    const ship: ShipCapabilities = {}

    const engineModules = modules.filter((m) => getModuleCapabilityType(m.itemId) === MODULE_ENGINE)
    if (engineModules.length > 0) {
        let totalThrust = 0
        let totalDrain = 0
        for (const m of engineModules) {
            const caps = computeEngineCapabilities(decodeCraftedItemStats(m.itemId, m.stats))
            totalThrust += applySlotMultiplier(caps.thrust, getSlotAmp(layout, m.slotIndex))
            totalDrain += caps.drain
        }
        ship.engines = {thrust: totalThrust, drain: totalDrain}
    }

    const generatorModules = modules.filter(
        (m) => getModuleCapabilityType(m.itemId) === MODULE_GENERATOR
    )
    if (generatorModules.length > 0) {
        let totalCapacity = 0
        let totalRecharge = 0
        for (const m of generatorModules) {
            const caps = computeGeneratorCapabilities(decodeCraftedItemStats(m.itemId, m.stats))
            const amp = getSlotAmp(layout, m.slotIndex)
            totalCapacity += applySlotMultiplier(caps.capacity, amp)
            totalRecharge += applySlotMultiplier(caps.recharge, amp)
        }
        ship.generator = {
            capacity: clampUint16(totalCapacity),
            recharge: clampUint16(totalRecharge),
        }
    }

    const gathererModules = modules.filter(
        (m) => getModuleCapabilityType(m.itemId) === MODULE_GATHERER
    )
    if (gathererModules.length > 0) {
        let totalYield = 0
        let totalDrain = 0
        let maxDepth = 0
        let totalSpeed = 0
        for (const m of gathererModules) {
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
        ship.gatherer = {
            yield: clampUint16(totalYield),
            drain: totalDrain,
            depth: maxDepth,
            speed: clampUint16(totalSpeed),
        }
    }

    const haulerModules = modules.filter((m) => getModuleCapabilityType(m.itemId) === MODULE_HAULER)
    if (haulerModules.length > 0) {
        let totalCapacity = 0
        let weightedEffNum = 0
        let totalDrain = 0
        for (const m of haulerModules) {
            const caps = computeHaulerCapabilities(decodeCraftedItemStats(m.itemId, m.stats))
            const eff = applySlotMultiplier(caps.efficiency, getSlotAmp(layout, m.slotIndex))
            totalCapacity += caps.capacity
            weightedEffNum += eff * caps.capacity
            totalDrain += caps.drain
        }
        const efficiency = totalCapacity > 0 ? Math.floor(weightedEffNum / totalCapacity) : 0
        ship.hauler = {
            capacity: totalCapacity,
            efficiency: clampUint16(efficiency),
            drain: totalDrain,
        }
    }

    const loaderModules = modules.filter((m) => getModuleCapabilityType(m.itemId) === MODULE_LOADER)
    if (loaderModules.length > 0) {
        let totalMass = 0
        let totalThrust = 0
        let totalQuantity = 0
        for (const m of loaderModules) {
            const caps = computeLoaderCapabilities(decodeCraftedItemStats(m.itemId, m.stats))
            totalMass += caps.mass
            totalThrust += applySlotMultiplier(caps.thrust, getSlotAmp(layout, m.slotIndex))
            totalQuantity += caps.quantity
        }
        ship.loaders = {
            mass: totalMass,
            thrust: clampUint16(totalThrust),
            quantity: totalQuantity,
        }
    }

    const crafterModules = modules.filter(
        (m) => getModuleCapabilityType(m.itemId) === MODULE_CRAFTER
    )
    if (crafterModules.length > 0) {
        let totalSpeed = 0
        let totalDrain = 0
        for (const m of crafterModules) {
            const caps = computeCrafterCapabilities(decodeCraftedItemStats(m.itemId, m.stats))
            totalSpeed += applySlotMultiplier(caps.speed, getSlotAmp(layout, m.slotIndex))
            totalDrain += caps.drain
        }
        ship.crafter = {speed: clampUint16(totalSpeed), drain: totalDrain}
    }

    return ship
}
