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
    moduleAccepts,
    moduleSlotTypeToCode,
} from '../capabilities/modules'
import {
    computeShipCapabilities,
    computeStorageCapabilities,
    computeWarehouseHullCapabilities,
} from './ship-deploy'
import {computeWarehouseCapabilities} from './warehouse'
import {computeExtractorCapabilities} from './extractor'
import {computeFactoryCapabilities} from './factory'
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
    const capabilities = computeShipCapabilities(installed, layout)
    if (capabilities.engines) info.engines = capabilities.engines
    if (capabilities.generator) info.generator = capabilities.generator
    if (capabilities.gatherer) info.gatherer = capabilities.gatherer
    if (capabilities.hauler) info.hauler = capabilities.hauler
    if (capabilities.loaders) info.loaders = capabilities.loaders
    if (capabilities.crafter) info.crafter = capabilities.crafter
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
    const capabilities = computeWarehouseCapabilities(installed, layout)
    if (capabilities.loaders) info.loaders = capabilities.loaders
    const storageBonus = computeStorageBonus(installed, baseCapacity)
    info.capacity = UInt32.from(baseCapacity + storageBonus)
}

function applyExtractorCapabilities(
    info: Record<string, unknown>,
    moduleEntries: ServerContract.Types.module_entry[],
    layout: EntitySlot[]
): void {
    const installed = toInstalledModules(moduleEntries)
    const capabilities = computeExtractorCapabilities(installed, layout)
    if (capabilities.generator) info.generator = capabilities.generator
    if (capabilities.gatherer) info.gatherer = capabilities.gatherer
}

function applyFactoryCapabilities(
    info: Record<string, unknown>,
    moduleEntries: ServerContract.Types.module_entry[],
    layout: EntitySlot[]
): void {
    const installed = toInstalledModules(moduleEntries)
    const capabilities = computeFactoryCapabilities(installed, layout)
    if (capabilities.generator) info.generator = capabilities.generator
    if (capabilities.crafter) info.crafter = capabilities.crafter
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
