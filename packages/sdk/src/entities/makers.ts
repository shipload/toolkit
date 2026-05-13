import {Name, UInt16, UInt32, UInt64, UInt8} from '@wharfkit/antelope'
import type {NameType, UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {Entity} from './entity'
import {getKindMeta, getTemplateMeta} from '../data/kind-registry'
import type {EntityTypeName} from '../data/kind-registry'
import {getEntityLayout} from '../data/recipes-runtime'
import type {EntitySlot} from '../data/recipes-runtime'
import {itemMetadata} from '../data/metadata'
import {getItem} from '../data/catalog'
import {getModuleCapabilityType, moduleAccepts, moduleSlotTypeToCode} from '../capabilities/modules'
import {computeEntityCapabilities} from '../derivation/capabilities'
import type {InstalledModule} from './slot-multiplier'

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
    slots: EntitySlot[],
    modules: PackedModuleInput[],
    entityLabel: string
): ServerContract.Types.module_entry[] {
    const result: Array<{type: number; installed?: ServerContract.Types.packed_module}> = slots.map(
        (s) => ({type: moduleSlotTypeToCode(s.type), installed: undefined})
    )

    for (const mod of modules) {
        const modType = getModuleCapabilityType(mod.itemId)
        const slotIdx = result.findIndex((r) => !r.installed && moduleAccepts(r.type, modType))
        if (slotIdx === -1) {
            let modName: string
            try {
                modName = getItem(mod.itemId).name
            } catch {
                modName = itemMetadata[mod.itemId]?.name ?? `item ${mod.itemId}`
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
            itemId: Number(entry.installed.item_id.value),
            stats: BigInt(entry.installed.stats.toString()),
        })
    })
    return installed
}

const ZERO_HULL_STATS: Record<string, number> = {
    density: 0,
    strength: 0,
    hardness: 0,
    saturation: 0,
}

export function makeEntity(packedItemId: number, state: EntityStateInput): Entity {
    const template = getTemplateMeta(packedItemId)
    if (!template) {
        throw new Error(`Unknown packed entity item ID: ${packedItemId}`)
    }

    const kind = template.kind.toString() as EntityTypeName
    const layout = getEntityLayout(packedItemId)?.slots ?? []
    const mods = state.modules ?? []

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

    if (state.energy !== undefined) info.energy = UInt16.from(state.energy)
    if (state.schedule) info.schedule = state.schedule

    if (kind === 'container') {
        info.modules = []
        if (state.hullmass !== undefined) info.hullmass = UInt32.from(state.hullmass)
        if (state.capacity !== undefined) info.capacity = UInt32.from(state.capacity)
    } else {
        const entityLabel = getKindMeta(template.kind)?.defaultLabel ?? kind
        const moduleEntries = assignModulesToSlots(layout, mods, entityLabel)
        info.modules = moduleEntries

        const installed = toInstalledModules(moduleEntries)
        const caps = computeEntityCapabilities(ZERO_HULL_STATS, packedItemId, installed, layout)

        if (state.hullmass !== undefined) {
            info.hullmass = UInt32.from(state.hullmass)
        } else if (installed.length > 0) {
            info.hullmass = UInt32.from(caps.hullmass)
        }

        if (state.capacity !== undefined) {
            info.capacity = UInt32.from(state.capacity)
        } else {
            info.capacity = UInt32.from(caps.capacity)
        }

        if (caps.engines) info.engines = caps.engines
        if (caps.generator) info.generator = caps.generator
        if (caps.gatherer) info.gatherer = caps.gatherer
        if (caps.loaders) info.loaders = caps.loaders
        if (caps.crafter) info.crafter = caps.crafter
        if (caps.hauler) info.hauler = caps.hauler
        if (caps.warp) info.warp = caps.warp
    }

    const entityInfo = ServerContract.Types.entity_info.from(info)
    return new Entity(entityInfo)
}
