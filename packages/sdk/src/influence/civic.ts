import {Name, type NameType, UInt16, UInt64, UInt8} from '@wharfkit/antelope'
import {
    getModuleCapabilityType,
    MODULE_BUILDER,
    MODULE_CRAFTER,
    MODULE_LOADER,
    MODULE_STORAGE,
    moduleSlotTypeToCode,
} from '../capabilities/modules'
import {ServerContract} from '../contracts'
import {
    ITEM_BUILDER_T1,
    ITEM_CONSTRUCTION_DOCK_T1_PACKED,
    ITEM_CRAFTER_T1,
    ITEM_DEPOT_T1_PACKED,
    ITEM_LOADER_T1,
    ITEM_NEXUS_T1_PACKED,
    ITEM_STORAGE_T1,
    ITEM_WORKSHOP_T1_PACKED,
} from '../data/item-ids'
import {
    ENTITY_CONSTRUCTION_DOCK,
    ENTITY_DEPOT,
    ENTITY_NEXUS,
    ENTITY_WORKSHOP,
} from '../data/kind-registry'
import {getEntityLayout} from '../data/recipes-runtime'
import {decodeStat, encodeStats} from '../derivation/crafting'
import type {CharterGrant, CharterNode} from './charters'
import {
    CIVIC_DEPOT,
    CIVIC_DOCK,
    CIVIC_GRANT_LEVEL_GATE,
    CIVIC_GRANT_MODULE,
    CIVIC_GRANT_RUNG,
    CIVIC_NEXUS,
    CIVIC_SPEED_CAP,
    CIVIC_STAT_BUILD_SPEED,
    CIVIC_STAT_CRAFT_SPEED,
    CIVIC_STAT_STORAGE_CAPACITY,
    CIVIC_STAT_TRANSFER_SPEED,
    CIVIC_WORKSHOP,
} from './constants'
import {getStatCount} from './quality'

type ModuleEntry = ServerContract.Types.module_entry

export interface CivicStatDef {
    building: number
    stat: number
    base: number
    cap: number
}

export const CIVIC_STAT_DEFS: readonly CivicStatDef[] = [
    {building: CIVIC_WORKSHOP, stat: CIVIC_STAT_CRAFT_SPEED, base: 0, cap: CIVIC_SPEED_CAP},
    {building: CIVIC_DOCK, stat: CIVIC_STAT_BUILD_SPEED, base: 0, cap: CIVIC_SPEED_CAP},
    {building: CIVIC_DEPOT, stat: CIVIC_STAT_TRANSFER_SPEED, base: 0, cap: CIVIC_SPEED_CAP},
    {building: CIVIC_DEPOT, stat: CIVIC_STAT_STORAGE_CAPACITY, base: 0, cap: CIVIC_SPEED_CAP},
]

export function findCivicStatDef(building: number, stat: number): CivicStatDef | undefined {
    return CIVIC_STAT_DEFS.find((def) => def.building === building && def.stat === stat)
}

export function civicHullItem(building: number): number {
    switch (building) {
        case CIVIC_WORKSHOP:
            return ITEM_WORKSHOP_T1_PACKED
        case CIVIC_NEXUS:
            return ITEM_NEXUS_T1_PACKED
        case CIVIC_DOCK:
            return ITEM_CONSTRUCTION_DOCK_T1_PACKED
        case CIVIC_DEPOT:
            return ITEM_DEPOT_T1_PACKED
        default:
            return 0
    }
}

export function civicModuleItemFor(moduleType: number): number {
    switch (moduleType) {
        case MODULE_CRAFTER:
            return ITEM_CRAFTER_T1
        case MODULE_BUILDER:
            return ITEM_BUILDER_T1
        case MODULE_LOADER:
            return ITEM_LOADER_T1
        case MODULE_STORAGE:
            return ITEM_STORAGE_T1
        default:
            return 0
    }
}

export function civicStatModuleType(stat: number): number {
    switch (stat) {
        case CIVIC_STAT_CRAFT_SPEED:
            return MODULE_CRAFTER
        case CIVIC_STAT_BUILD_SPEED:
            return MODULE_BUILDER
        case CIVIC_STAT_TRANSFER_SPEED:
            return MODULE_LOADER
        case CIVIC_STAT_STORAGE_CAPACITY:
            return MODULE_STORAGE
        default:
            return 0
    }
}

export function civicBuildingKind(building: number): Name | undefined {
    switch (building) {
        case CIVIC_WORKSHOP:
            return ENTITY_WORKSHOP
        case CIVIC_NEXUS:
            return ENTITY_NEXUS
        case CIVIC_DOCK:
            return ENTITY_CONSTRUCTION_DOCK
        case CIVIC_DEPOT:
            return ENTITY_DEPOT
        default:
            return undefined
    }
}

export function civicBuildingFor(kind: NameType): number | undefined {
    const name = Name.from(kind)
    if (name.equals(ENTITY_WORKSHOP)) return CIVIC_WORKSHOP
    if (name.equals(ENTITY_NEXUS)) return CIVIC_NEXUS
    if (name.equals(ENTITY_CONSTRUCTION_DOCK)) return CIVIC_DOCK
    if (name.equals(ENTITY_DEPOT)) return CIVIC_DEPOT
    return undefined
}

export function isCivicKind(kind: NameType): boolean {
    return civicBuildingFor(kind) !== undefined
}

export function isCivicEntity(entity: {owner: NameType}, civicOwner: NameType): boolean {
    return Name.from(entity.owner).equals(Name.from(civicOwner))
}

function moduleItemId(module: ServerContract.Types.packed_module): number {
    return Number(module.item_id.value ?? module.item_id)
}

function moduleStats(module: ServerContract.Types.packed_module): bigint {
    return BigInt(module.stats.toString())
}

function packedModule(itemId: number, stats: bigint): ServerContract.Types.packed_module {
    return ServerContract.Types.packed_module.from({
        item_id: UInt16.from(itemId),
        stats: UInt64.from(stats.toString()),
    })
}

function cloneEntry(
    entry: ModuleEntry,
    installed?: ServerContract.Types.packed_module
): ModuleEntry {
    return ServerContract.Types.module_entry.from({
        type: UInt8.from(Number(entry.type.value ?? entry.type)),
        installed:
            installed ??
            (entry.installed
                ? packedModule(moduleItemId(entry.installed), moduleStats(entry.installed))
                : undefined),
    })
}

export function emptyCivicModules(building: number): ModuleEntry[] {
    const layout = getEntityLayout(civicHullItem(building))?.slots ?? []
    return layout.map((slot) =>
        ServerContract.Types.module_entry.from({type: UInt8.from(moduleSlotTypeToCode(slot.type))})
    )
}

export function fitCivicModules(modules: ModuleEntry[], count: number): ModuleEntry[] {
    const next = modules.map((entry) => cloneEntry(entry))
    let remaining = count
    for (let i = 0; i < next.length && remaining > 0; i++) {
        if (next[i].installed) continue
        const type = Number(next[i].type.value ?? next[i].type)
        const item = civicModuleItemFor(type)
        if (item === 0) throw new Error('charter grant found no open slot of its module type')
        let stats = encodeStats(new Array(getStatCount(item)).fill(0))
        for (const sibling of next) {
            if (
                sibling.installed &&
                getModuleCapabilityType(moduleItemId(sibling.installed)) === type
            ) {
                stats = moduleStats(sibling.installed)
                break
            }
        }
        next[i] = cloneEntry(next[i], packedModule(item, stats))
        remaining--
    }
    if (remaining > 0) throw new Error('charter grant found no open slot of its module type')
    return next
}

export function raiseCivicStat(modules: ModuleEntry[], grant: CharterGrant): ModuleEntry[] {
    const def = findCivicStatDef(grant.building, grant.stat)
    if (!def) throw new Error(`no civic stat ${grant.stat} on building ${grant.building}`)
    const type = civicStatModuleType(grant.stat)
    let raised = 0
    const next = modules.map((entry) => {
        if (!entry.installed || getModuleCapabilityType(moduleItemId(entry.installed)) !== type) {
            return cloneEntry(entry)
        }
        const item = moduleItemId(entry.installed)
        const stats = moduleStats(entry.installed)
        const values: number[] = []
        for (let c = 0; c < getStatCount(item); c++) {
            values.push(Math.min(decodeStat(stats, c) + grant.value, def.cap))
        }
        raised++
        return cloneEntry(entry, packedModule(item, encodeStats(values)))
    })
    if (raised === 0) throw new Error('charter rung found no module carrying its stat')
    return next
}

export interface CivicBuildingPreview {
    building: number
    itemId: number
    spawned: boolean
    modules: ModuleEntry[]
}

export type CivicStanding = Partial<Record<number, ModuleEntry[]>>

export function previewCharterGrants(
    node: CharterNode,
    standing: CivicStanding = {}
): CivicBuildingPreview[] {
    const previews = new Map<number, CivicBuildingPreview>()
    const target = (building: number, spawn: boolean): CivicBuildingPreview => {
        let preview = previews.get(building)
        if (preview) return preview
        const current = standing[building]
        if (!current && !spawn)
            throw new Error('charter grant targets a building that is not standing')
        preview = {
            building,
            itemId: civicHullItem(building),
            spawned: !current,
            modules: current
                ? current.map((entry) => cloneEntry(entry))
                : emptyCivicModules(building),
        }
        previews.set(building, preview)
        return preview
    }
    for (const grant of node.grants) {
        if (grant.kind === CIVIC_GRANT_LEVEL_GATE) {
            target(grant.building, true)
        } else if (grant.kind === CIVIC_GRANT_MODULE) {
            const preview = target(grant.building, false)
            preview.modules = fitCivicModules(preview.modules, grant.value)
        } else if (grant.kind === CIVIC_GRANT_RUNG) {
            const preview = target(grant.building, false)
            preview.modules = raiseCivicStat(preview.modules, grant)
        }
    }
    return [...previews.values()]
}
