import {Name, UInt16, UInt32, UInt64, UInt8} from '@wharfkit/antelope'
import type {NameType, UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {Entity} from './entity'
import {getTemplateMeta} from '../data/kind-registry'
import type {EntityTypeName} from '../data/kind-registry'
import {getEntityLayout, type EntitySlot} from '../data/recipes-runtime'
import {itemMetadata} from '../data/metadata'
import {getItem} from '../data/catalog'
import {
    getModuleCapabilityType,
    MODULE_STORAGE,
    MODULE_ENGINE,
    MODULE_GENERATOR,
    MODULE_GATHERER,
    MODULE_LOADER,
    MODULE_CRAFTER,
    MODULE_HAULER,
    moduleAccepts,
    moduleSlotTypeToCode,
} from '../capabilities/modules'
import {
    computeStorageCapabilities,
    computeEngineCapabilities,
    computeGeneratorCapabilities,
    computeGathererCapabilities,
    computeLoaderCapabilities,
    computeCrafterCapabilities,
    computeHaulerCapabilities,
} from '../derivation/capabilities'
import {applySlotMultiplier, clampUint16, getSlotAmp, type InstalledModule} from './slot-multiplier'
import {decodeCraftedItemStats} from '../derivation/crafting'

export interface PackedModuleInput {
    itemId: number
    stats: bigint
}

export interface EntityStateInput {
    id: UInt64Type
    owner: NameType
    name: string
    coordinates: {x: number; y: number; z?: number}
    hullmass?: number
    capacity?: number
    cargomass?: number
    energy?: number
    modules?: PackedModuleInput[]
    schedule?: ServerContract.Types.schedule
    cargo?: ServerContract.Types.cargo_item[]
}

function assignModulesToSlots(
    packedEntityItemId: number,
    modules: PackedModuleInput[],
    entityLabel: string
): ServerContract.Types.module_entry[] {
    const layout = getEntityLayout(packedEntityItemId)
    const slots = layout?.slots ?? []
    const result: Array<{type: number; installed?: ServerContract.Types.packed_module}> = slots.map(
        (s) => ({type: moduleSlotTypeToCode(s.type), installed: undefined})
    )

    for (const mod of modules) {
        const itemId = Number(UInt16.from(mod.itemId).value.toString())
        const modType = getModuleCapabilityType(itemId)
        const slotIdx = result.findIndex((r) => !r.installed && moduleAccepts(r.type, modType))
        if (slotIdx === -1) {
            let modName: string
            try {
                modName = getItem(itemId).name
            } catch {
                modName = itemMetadata[itemId]?.name ?? `item ${itemId}`
            }
            throw new Error(
                `No compatible slot for module ${modName} (type ${modType}) on ${entityLabel}`
            )
        }
        result[slotIdx].installed = ServerContract.Types.packed_module.from({
            item_id: UInt16.from(mod.itemId),
            stats: UInt64.from(mod.stats),
        })
    }

    return result.map((r) =>
        ServerContract.Types.module_entry.from({
            type: UInt8.from(r.type),
            installed: r.installed,
        })
    )
}

function toInstalledModules(entries: ServerContract.Types.module_entry[]): InstalledModule[] {
    const installed: InstalledModule[] = []
    entries.forEach((entry, slotIndex) => {
        if (!entry.installed) return
        installed.push({
            slotIndex,
            itemId: Number(UInt16.from(entry.installed.item_id).value.toString()),
            stats: BigInt(UInt64.from(entry.installed.stats).toString()),
        })
    })
    return installed
}


function computeStorageBonus(modules: InstalledModule[], baseCapacity: number): number {
    let totalBonus = 0
    for (const m of modules) {
        if (getModuleCapabilityType(m.itemId) !== MODULE_STORAGE) continue
        const stats = decodeCraftedItemStats(m.itemId, m.stats)
        const {capacityBonus} = computeStorageCapabilities(stats, baseCapacity)
        totalBonus += capacityBonus
    }
    return totalBonus
}

function applyShipCapabilities(
    info: Record<string, unknown>,
    moduleEntries: ServerContract.Types.module_entry[],
    layout: EntitySlot[],
    baseCapacity: number
): void {
    const installed = toInstalledModules(moduleEntries)
    let totalThrust = 0
    let totalEngineDrain = 0
    let hasEngine = false
    let totalGenCapacity = 0
    let totalGenRecharge = 0
    let hasGenerator = false
    let totalGathYield = 0
    let totalGathDrain = 0
    let maxGathDepth = 0
    let totalGathSpeed = 0
    let hasGatherer = false
    let totalLoaderMass = 0
    let totalLoaderThrust = 0
    let totalLoaderQty = 0
    let hasLoader = false
    let totalCrafterSpeed = 0
    let totalCrafterDrain = 0
    let hasCrafter = false
    let totalHaulerCap = 0
    let weightedHaulerEff = 0
    let totalHaulerDrain = 0
    let hasHauler = false
    for (const m of installed) {
        const modType = getModuleCapabilityType(m.itemId)
        const amp = getSlotAmp(layout, m.slotIndex)
        const stats = decodeCraftedItemStats(m.itemId, m.stats)
        if (modType === MODULE_ENGINE) {
            hasEngine = true
            const c = computeEngineCapabilities(stats)
            totalThrust += applySlotMultiplier(c.thrust, amp)
            totalEngineDrain += c.drain
        } else if (modType === MODULE_GENERATOR) {
            hasGenerator = true
            const c = computeGeneratorCapabilities(stats)
            totalGenCapacity += applySlotMultiplier(c.capacity, amp)
            totalGenRecharge += applySlotMultiplier(c.recharge, amp)
        } else if (modType === MODULE_GATHERER) {
            hasGatherer = true
            const tier = getItem(m.itemId).tier
            const c = computeGathererCapabilities(stats, tier)
            totalGathYield += applySlotMultiplier(c.yield, amp)
            totalGathDrain += c.drain
            if (c.depth > maxGathDepth) maxGathDepth = c.depth
            totalGathSpeed += applySlotMultiplier(c.speed, amp)
        } else if (modType === MODULE_LOADER) {
            hasLoader = true
            const c = computeLoaderCapabilities(stats)
            totalLoaderMass += c.mass
            totalLoaderThrust += applySlotMultiplier(c.thrust, amp)
            totalLoaderQty += c.quantity
        } else if (modType === MODULE_CRAFTER) {
            hasCrafter = true
            const c = computeCrafterCapabilities(stats)
            totalCrafterSpeed += applySlotMultiplier(c.speed, amp)
            totalCrafterDrain += c.drain
        } else if (modType === MODULE_HAULER) {
            hasHauler = true
            const c = computeHaulerCapabilities(stats)
            const eff = applySlotMultiplier(c.efficiency, amp)
            totalHaulerCap += c.capacity
            weightedHaulerEff += eff * c.capacity
            totalHaulerDrain += c.drain
        }
    }
    if (hasEngine) info.engines = {thrust: totalThrust, drain: totalEngineDrain}
    if (hasGenerator) info.generator = {capacity: clampUint16(totalGenCapacity), recharge: clampUint16(totalGenRecharge)}
    if (hasGatherer) info.gatherer = {yield: clampUint16(totalGathYield), drain: totalGathDrain, depth: maxGathDepth, speed: clampUint16(totalGathSpeed)}
    if (hasLoader) info.loaders = {mass: totalLoaderMass, thrust: clampUint16(totalLoaderThrust), quantity: totalLoaderQty}
    if (hasCrafter) info.crafter = {speed: clampUint16(totalCrafterSpeed), drain: totalCrafterDrain}
    if (hasHauler) {
        const eff = totalHaulerCap > 0 ? Math.floor(weightedHaulerEff / totalHaulerCap) : 0
        info.hauler = {capacity: totalHaulerCap, efficiency: clampUint16(eff), drain: totalHaulerDrain}
    }
    const storageBonus = computeStorageBonus(installed, baseCapacity)
    if (storageBonus > 0) info.capacity = UInt32.from(baseCapacity + storageBonus)
}

function applyWarehouseCapabilities(
    info: Record<string, unknown>,
    moduleEntries: ServerContract.Types.module_entry[],
    layout: EntitySlot[],
    baseCapacity: number
): void {
    const installed = toInstalledModules(moduleEntries)
    let totalLoaderMass = 0
    let totalLoaderThrust = 0
    let totalLoaderQty = 0
    let hasLoader = false
    for (const m of installed) {
        if (getModuleCapabilityType(m.itemId) !== MODULE_LOADER) continue
        hasLoader = true
        const amp = getSlotAmp(layout, m.slotIndex)
        const c = computeLoaderCapabilities(decodeCraftedItemStats(m.itemId, m.stats))
        totalLoaderMass += c.mass
        totalLoaderThrust += applySlotMultiplier(c.thrust, amp)
        totalLoaderQty += c.quantity
    }
    if (hasLoader) info.loaders = {mass: totalLoaderMass, thrust: clampUint16(totalLoaderThrust), quantity: totalLoaderQty}
    const storageBonus = computeStorageBonus(installed, baseCapacity)
    info.capacity = UInt32.from(baseCapacity + storageBonus)
}

function applyExtractorCapabilities(
    info: Record<string, unknown>,
    moduleEntries: ServerContract.Types.module_entry[],
    layout: EntitySlot[]
): void {
    const installed = toInstalledModules(moduleEntries)
    let totalGenCapacity = 0
    let totalGenRecharge = 0
    let hasGenerator = false
    let totalGathYield = 0
    let totalGathDrain = 0
    let maxGathDepth = 0
    let totalGathSpeed = 0
    let hasGatherer = false
    for (const m of installed) {
        const modType = getModuleCapabilityType(m.itemId)
        const amp = getSlotAmp(layout, m.slotIndex)
        const stats = decodeCraftedItemStats(m.itemId, m.stats)
        if (modType === MODULE_GENERATOR) {
            hasGenerator = true
            const c = computeGeneratorCapabilities(stats)
            totalGenCapacity += applySlotMultiplier(c.capacity, amp)
            totalGenRecharge += applySlotMultiplier(c.recharge, amp)
        } else if (modType === MODULE_GATHERER) {
            hasGatherer = true
            const tier = getItem(m.itemId).tier
            const c = computeGathererCapabilities(stats, tier)
            totalGathYield += applySlotMultiplier(c.yield, amp)
            totalGathDrain += c.drain
            if (c.depth > maxGathDepth) maxGathDepth = c.depth
            totalGathSpeed += applySlotMultiplier(c.speed, amp)
        }
    }
    if (hasGenerator) info.generator = {capacity: clampUint16(totalGenCapacity), recharge: clampUint16(totalGenRecharge)}
    if (hasGatherer) info.gatherer = {yield: clampUint16(totalGathYield), drain: totalGathDrain, depth: maxGathDepth, speed: clampUint16(totalGathSpeed)}
}

function applyFactoryCapabilities(
    info: Record<string, unknown>,
    moduleEntries: ServerContract.Types.module_entry[],
    layout: EntitySlot[]
): void {
    const installed = toInstalledModules(moduleEntries)
    let totalGenCapacity = 0
    let totalGenRecharge = 0
    let hasGenerator = false
    let totalCrafterSpeed = 0
    let totalCrafterDrain = 0
    let hasCrafter = false
    for (const m of installed) {
        const modType = getModuleCapabilityType(m.itemId)
        const amp = getSlotAmp(layout, m.slotIndex)
        const stats = decodeCraftedItemStats(m.itemId, m.stats)
        if (modType === MODULE_GENERATOR) {
            hasGenerator = true
            const c = computeGeneratorCapabilities(stats)
            totalGenCapacity += applySlotMultiplier(c.capacity, amp)
            totalGenRecharge += applySlotMultiplier(c.recharge, amp)
        } else if (modType === MODULE_CRAFTER) {
            hasCrafter = true
            const c = computeCrafterCapabilities(stats)
            totalCrafterSpeed += applySlotMultiplier(c.speed, amp)
            totalCrafterDrain += c.drain
        }
    }
    if (hasGenerator) info.generator = {capacity: clampUint16(totalGenCapacity), recharge: clampUint16(totalGenRecharge)}
    if (hasCrafter) info.crafter = {speed: clampUint16(totalCrafterSpeed), drain: totalCrafterDrain}
}

export function makeEntity(packedItemId: number, state: EntityStateInput): Entity {
    const template = getTemplateMeta(packedItemId)
    if (!template) {
        throw new Error(`Unknown packed entity item ID: ${packedItemId}`)
    }

    const kind = template.kind.toString() as EntityTypeName
    const layout = getEntityLayout(packedItemId)?.slots ?? []

    const info: Record<string, unknown> = {
        type: template.kind,
        id: UInt64.from(state.id),
        owner: Name.from(state.owner),
        entity_name: state.name,
        coordinates: ServerContract.Types.coordinates.from(state.coordinates),
        cargomass: UInt32.from(state.cargomass ?? 0),
        cargo: state.cargo || [],
        is_idle: !state.schedule,
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
    }

    if (state.hullmass !== undefined) info.hullmass = UInt32.from(state.hullmass)
    if (state.energy !== undefined) info.energy = UInt16.from(state.energy)
    if (state.schedule) info.schedule = state.schedule

    const mods = state.modules ?? []

    if (kind === 'container') {
        info.modules = []
        if (state.capacity !== undefined) info.capacity = UInt32.from(state.capacity)
    } else {
        const kindStr = kind.charAt(0).toUpperCase() + kind.slice(1)
        const moduleEntries = assignModulesToSlots(packedItemId, mods, kindStr)
        info.modules = moduleEntries

        if (mods.length > 0) {
            switch (kind) {
                case 'ship':
                    applyShipCapabilities(info, moduleEntries, layout, state.capacity ?? 0)
                    if (state.capacity !== undefined && !info.capacity) {
                        info.capacity = UInt32.from(state.capacity)
                    }
                    break
                case 'warehouse':
                    applyWarehouseCapabilities(info, moduleEntries, layout, state.capacity ?? 0)
                    break
                case 'extractor':
                    applyExtractorCapabilities(info, moduleEntries, layout)
                    if (state.capacity !== undefined) info.capacity = UInt32.from(state.capacity)
                    break
                case 'factory':
                    applyFactoryCapabilities(info, moduleEntries, layout)
                    if (state.capacity !== undefined) info.capacity = UInt32.from(state.capacity)
                    break
            }
        } else {
            if (kind === 'warehouse') {
                info.capacity = UInt32.from(state.capacity ?? 0)
            } else if (state.capacity !== undefined) {
                info.capacity = UInt32.from(state.capacity)
            }
        }
    }

    const entityInfo = ServerContract.Types.entity_info.from(info)
    return new Entity(entityInfo)
}
