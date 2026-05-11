import {Name, UInt16, UInt32, UInt64, UInt8} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {type PackedModuleInput, Ship, type ShipStateInput} from './ship'
import {computeWarehouseCapabilities, Warehouse, type WarehouseStateInput} from './warehouse'
import {Container, type ContainerStateInput} from './container'
import {Extractor, computeExtractorCapabilities, type ExtractorStateInput} from './extractor'
import {Factory, computeFactoryCapabilities, type FactoryStateInput} from './factory'
import {
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_FACTORY_T1_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '../data/item-ids'
import {getEntityLayout, type EntitySlot} from '../data/recipes-runtime'
import {itemMetadata} from '../data/metadata'
import {getItem} from '../data/catalog'
import {
    getModuleCapabilityType,
    MODULE_STORAGE,
    moduleAccepts,
    moduleSlotTypeToCode,
} from '../capabilities/modules'
import {computeShipCapabilities, computeStorageCapabilities} from './ship-deploy'
import type {InstalledModule} from './slot-multiplier'
import {decodeCraftedItemStats} from '../derivation/crafting'

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

function deriveShipFromModules(
    moduleEntries: ServerContract.Types.module_entry[],
    layout: EntitySlot[],
    baseCapacity: number
): {
    capabilities: ReturnType<typeof computeShipCapabilities>
    finalCapacity: number
} {
    const installed = toInstalledModules(moduleEntries)
    const capabilities = computeShipCapabilities(installed, layout)
    const totalBonus = computeStorageBonus(installed, baseCapacity)
    return {capabilities, finalCapacity: baseCapacity + totalBonus}
}

export function makeShip(state: ShipStateInput): Ship {
    const info: Record<string, unknown> = {
        type: Name.from('ship'),
        id: UInt64.from(state.id),
        owner: Name.from(state.owner),
        entity_name: state.name,
        coordinates: ServerContract.Types.coordinates.from(state.coordinates),
        cargomass: UInt32.from(0),
        cargo: state.cargo || [],
        is_idle: !state.schedule,
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
    }
    if (state.hullmass !== undefined) info.hullmass = UInt32.from(state.hullmass)
    if (state.energy !== undefined) info.energy = UInt16.from(state.energy)
    if (state.schedule) info.schedule = state.schedule

    let moduleEntries: ServerContract.Types.module_entry[] = []
    const shipLayout = getEntityLayout(ITEM_SHIP_T1_PACKED)?.slots ?? []
    if (state.modules && state.modules.length > 0) {
        moduleEntries = assignModulesToSlots(ITEM_SHIP_T1_PACKED, state.modules, 'Ship T1')
        const {capabilities, finalCapacity} = deriveShipFromModules(
            moduleEntries,
            shipLayout,
            state.capacity ?? 0
        )
        if (capabilities.engines) info.engines = capabilities.engines
        if (capabilities.generator) info.generator = capabilities.generator
        if (capabilities.gatherer) info.gatherer = capabilities.gatherer
        if (capabilities.hauler) info.hauler = capabilities.hauler
        if (capabilities.loaders) info.loaders = capabilities.loaders
        if (capabilities.crafter) info.crafter = capabilities.crafter
        if (state.capacity !== undefined) info.capacity = UInt32.from(finalCapacity)
    } else {
        moduleEntries = assignModulesToSlots(ITEM_SHIP_T1_PACKED, [], 'Ship T1')
        if (state.capacity !== undefined) info.capacity = UInt32.from(state.capacity)
    }

    info.modules = moduleEntries

    const entityInfo = ServerContract.Types.entity_info.from(info)
    return new Ship(entityInfo)
}

export function makeWarehouse(state: WarehouseStateInput): Warehouse {
    const info: Record<string, unknown> = {
        type: Name.from('warehouse'),
        id: UInt64.from(state.id),
        owner: Name.from(state.owner),
        entity_name: state.name,
        coordinates: ServerContract.Types.coordinates.from(state.coordinates),
        capacity: UInt32.from(state.capacity),
        cargomass: UInt32.from(0),
        cargo: state.cargo || [],
        is_idle: !state.schedule,
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
    }
    if (state.hullmass !== undefined) info.hullmass = UInt32.from(state.hullmass)
    if (state.schedule) info.schedule = state.schedule

    let moduleEntries: ServerContract.Types.module_entry[] = []
    const warehouseLayout = getEntityLayout(ITEM_WAREHOUSE_T1_PACKED)?.slots ?? []
    if (state.modules && state.modules.length > 0) {
        moduleEntries = assignModulesToSlots(
            ITEM_WAREHOUSE_T1_PACKED,
            state.modules,
            'Warehouse T1'
        )
        const installed = toInstalledModules(moduleEntries)
        const capabilities = computeWarehouseCapabilities(installed, warehouseLayout)
        if (capabilities.loaders) info.loaders = capabilities.loaders

        const totalBonus = computeStorageBonus(installed, state.capacity)
        info.capacity = UInt32.from(state.capacity + totalBonus)
    } else {
        moduleEntries = assignModulesToSlots(ITEM_WAREHOUSE_T1_PACKED, [], 'Warehouse T1')
    }

    info.modules = moduleEntries

    const entityInfo = ServerContract.Types.entity_info.from(info)
    return new Warehouse(entityInfo)
}

export function makeExtractor(state: ExtractorStateInput): Extractor {
    const info: Record<string, unknown> = {
        type: Name.from('extractor'),
        id: UInt64.from(state.id),
        owner: Name.from(state.owner),
        entity_name: state.name,
        coordinates: ServerContract.Types.coordinates.from(state.coordinates),
        cargomass: UInt32.from(0),
        cargo: state.cargo || [],
        is_idle: !state.schedule,
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
    }
    if (state.hullmass !== undefined) info.hullmass = UInt32.from(state.hullmass)
    if (state.energy !== undefined) info.energy = UInt16.from(state.energy)
    if (state.schedule) info.schedule = state.schedule
    if (state.capacity !== undefined) info.capacity = UInt32.from(state.capacity)

    const moduleEntries = assignModulesToSlots(
        ITEM_EXTRACTOR_T1_PACKED,
        state.modules ?? [],
        'Extractor T1'
    )
    if (state.modules && state.modules.length > 0) {
        const layout = getEntityLayout(ITEM_EXTRACTOR_T1_PACKED)?.slots ?? []
        const installed = toInstalledModules(moduleEntries)
        const capabilities = computeExtractorCapabilities(installed, layout)
        if (capabilities.generator) info.generator = capabilities.generator
        if (capabilities.gatherer) info.gatherer = capabilities.gatherer
    }

    info.modules = moduleEntries

    const entityInfo = ServerContract.Types.entity_info.from(info)
    return new Extractor(entityInfo)
}

export function makeFactory(state: FactoryStateInput): Factory {
    const info: Record<string, unknown> = {
        type: Name.from('factory'),
        id: UInt64.from(state.id),
        owner: Name.from(state.owner),
        entity_name: state.name,
        coordinates: ServerContract.Types.coordinates.from(state.coordinates),
        cargomass: UInt32.from(0),
        cargo: state.cargo || [],
        is_idle: !state.schedule,
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
    }
    if (state.hullmass !== undefined) info.hullmass = UInt32.from(state.hullmass)
    if (state.energy !== undefined) info.energy = UInt16.from(state.energy)
    if (state.schedule) info.schedule = state.schedule
    if (state.capacity !== undefined) info.capacity = UInt32.from(state.capacity)

    const moduleEntries = assignModulesToSlots(
        ITEM_FACTORY_T1_PACKED,
        state.modules ?? [],
        'Factory T1'
    )
    if (state.modules && state.modules.length > 0) {
        const layout = getEntityLayout(ITEM_FACTORY_T1_PACKED)?.slots ?? []
        const installed = toInstalledModules(moduleEntries)
        const capabilities = computeFactoryCapabilities(installed, layout)
        if (capabilities.generator) info.generator = capabilities.generator
        if (capabilities.crafter) info.crafter = capabilities.crafter
    }

    info.modules = moduleEntries

    const entityInfo = ServerContract.Types.entity_info.from(info)
    return new Factory(entityInfo)
}

export function makeContainer(state: ContainerStateInput): Container {
    const entityInfo = ServerContract.Types.entity_info.from({
        type: Name.from('container'),
        id: UInt64.from(state.id),
        owner: Name.from(state.owner),
        entity_name: state.name,
        coordinates: ServerContract.Types.coordinates.from(state.coordinates),
        hullmass: UInt32.from(state.hullmass),
        capacity: UInt32.from(state.capacity),
        cargomass: UInt32.from(state.cargomass || 0),
        cargo: state.cargo || [],
        modules: [],
        is_idle: !state.schedule,
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
        schedule: state.schedule,
    })
    return new Container(entityInfo)
}
