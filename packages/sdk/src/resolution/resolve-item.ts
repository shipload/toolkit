import {UInt16, UInt64} from '@wharfkit/antelope'
import type {UInt16Type, UInt64Type} from '@wharfkit/antelope'
import type {ResourceCategory} from '../types'
import {getItem} from '../data/catalog'
import {getEntityLayout} from '../data/recipes-runtime'
import {entityMetadata, itemMetadata} from '../data/metadata'
import {
    getModuleCapabilityType,
    isModuleItem,
    MODULE_CRAFTER,
    MODULE_ENGINE,
    MODULE_GATHERER,
    MODULE_GENERATOR,
    MODULE_HAULER,
    MODULE_LOADER,
    MODULE_STORAGE,
} from '../capabilities/modules'
import {decodeCraftedItemStats, decodeStat} from '../derivation/crafting'
import {getStatDefinitions} from '../derivation/stats'
import {
    computeCrafterCapabilities,
    computeEngineCapabilities,
    computeGathererCapabilities,
    computeGeneratorCapabilities,
    computeHaulerCapabilities,
    computeLoaderCapabilities,
    computeShipHullCapabilities,
    computeWarehouseHullCapabilities,
} from '../entities/ship-deploy'
import {computeContainerCapabilities, computeContainerT2Capabilities} from '../entities/container'
import {
    categoryColors,
    categoryIcons,
    componentIcon,
    itemAbbreviations,
    moduleIcon,
} from '../data/colors'
import type {ServerContract} from '../contracts'
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '../data/item-ids'

export interface ResolvedItemStat {
    key: string
    label: string
    abbreviation: string
    value: number
    color: string
    category?: ResourceCategory
    inverted?: boolean
}

export interface ResolvedAttributeGroup {
    capability: string
    attributes: {label: string; value: number}[]
}

export type ResolvedItemType = 'resource' | 'component' | 'module' | 'entity'

export interface ResolvedModuleSlot {
    name?: string
    installed: boolean
    attributes?: {label: string; value: number}[]
}

export interface ResolvedItem {
    itemId: number
    name: string
    icon: string
    abbreviation: string | null
    category?: ResourceCategory
    tier: number
    mass: number
    itemType: ResolvedItemType
    stats?: ResolvedItemStat[]
    attributes?: ResolvedAttributeGroup[]
    moduleSlots?: ResolvedModuleSlot[]
}

function toNum(v: UInt16Type): number {
    return Number(UInt16.from(v).value.toString())
}

function toBigStats(v: UInt64Type): bigint {
    return BigInt(UInt64.from(v).toString())
}

function resolveResource(id: number, stats?: UInt64Type): ResolvedItem {
    const item = getItem(id)
    const cat = item.category
    let resolvedStats: ResolvedItemStat[] | undefined
    if (stats !== undefined && cat) {
        const bigStats = toBigStats(stats)
        const defs = getStatDefinitions(cat)
        const values = [decodeStat(bigStats, 0), decodeStat(bigStats, 1), decodeStat(bigStats, 2)]
        resolvedStats = defs.map((d, i) => ({
            key: d.key,
            label: d.label,
            abbreviation: d.abbreviation,
            value: values[i] ?? 0,
            color: categoryColors[cat],
            category: cat,
            inverted: d.inverted,
        }))
    }
    return {
        itemId: id,
        name: item.name,
        icon: cat ? categoryIcons[cat] : '⬡',
        abbreviation: null,
        category: cat,
        tier: item.tier,
        mass: item.mass,
        itemType: 'resource',
        stats: resolvedStats,
    }
}

function resolveComponent(id: number, stats?: UInt64Type): ResolvedItem {
    const item = getItem(id)
    let resolvedStats: ResolvedItemStat[] | undefined
    if (stats !== undefined) {
        const decoded = decodeCraftedItemStats(id, toBigStats(stats))
        resolvedStats = Object.entries(decoded).map(([key, value]) => {
            const allDefs = getStatDefinitions('ore')
                .concat(getStatDefinitions('crystal'))
                .concat(getStatDefinitions('gas'))
                .concat(getStatDefinitions('regolith'))
                .concat(getStatDefinitions('biomass'))
            const def = allDefs.find((d) => d.key === key)
            return {
                key,
                label: def?.label ?? key,
                abbreviation: def?.abbreviation ?? key.slice(0, 3).toUpperCase(),
                value,
                color: '#9BADB8',
                inverted: def?.inverted,
            }
        })
    }
    return {
        itemId: id,
        name: item.name,
        icon: itemAbbreviations[id] ?? componentIcon,
        abbreviation: itemAbbreviations[id] ?? null,
        tier: item.tier,
        mass: item.mass,
        itemType: 'component',
        stats: resolvedStats,
    }
}

function computeCapabilityGroup(
    moduleType: number,
    stats: Record<string, number>
): ResolvedAttributeGroup | undefined {
    switch (moduleType) {
        case MODULE_ENGINE: {
            const caps = computeEngineCapabilities(stats)
            return {
                capability: 'Engine',
                attributes: [
                    {label: 'Thrust', value: caps.thrust},
                    {label: 'Drain', value: caps.drain},
                ],
            }
        }
        case MODULE_GENERATOR: {
            const caps = computeGeneratorCapabilities(stats)
            return {
                capability: 'Generator',
                attributes: [
                    {label: 'Capacity', value: caps.capacity},
                    {label: 'Recharge', value: caps.recharge},
                ],
            }
        }
        case MODULE_GATHERER: {
            const caps = computeGathererCapabilities(stats)
            return {
                capability: 'Gatherer',
                attributes: [
                    {label: 'Yield', value: caps.yield},
                    {label: 'Drain', value: caps.drain},
                    {label: 'Depth', value: caps.depth},
                    {label: 'Speed', value: caps.speed},
                ],
            }
        }
        case MODULE_LOADER: {
            const caps = computeLoaderCapabilities(stats)
            return {
                capability: 'Loader',
                attributes: [
                    {label: 'Mass', value: caps.mass},
                    {label: 'Thrust', value: caps.thrust},
                    {label: 'Quantity', value: caps.quantity},
                ],
            }
        }
        case MODULE_CRAFTER: {
            const caps = computeCrafterCapabilities(stats)
            return {
                capability: 'Crafter',
                attributes: [
                    {label: 'Speed', value: caps.speed},
                    {label: 'Drain', value: caps.drain},
                ],
            }
        }
        case MODULE_HAULER: {
            const caps = computeHaulerCapabilities(stats)
            return {
                capability: 'Hauler',
                attributes: [
                    {label: 'Capacity', value: caps.capacity},
                    {label: 'Efficiency', value: caps.efficiency},
                    {label: 'Drain', value: caps.drain},
                ],
            }
        }
        case MODULE_STORAGE: {
            const str = stats.strength
            const den = stats.density
            const hrd = stats.hardness
            const sat = stats.saturation
            const statSum = str + den + hrd + sat
            const pct = 10 + Math.floor((statSum * 10) / 2997)
            return {capability: 'Storage', attributes: [{label: 'Capacity Bonus', value: pct}]}
        }
        default:
            return undefined
    }
}

function resolveModule(id: number, stats?: UInt64Type): ResolvedItem {
    const item = getItem(id)
    let attributes: ResolvedAttributeGroup[] | undefined
    if (stats !== undefined) {
        const decoded = decodeCraftedItemStats(id, toBigStats(stats))
        const modType = getModuleCapabilityType(id)
        const group = computeCapabilityGroup(modType, decoded)
        if (group) attributes = [group]
    }
    return {
        itemId: id,
        name: item.name,
        icon: itemAbbreviations[id] ?? moduleIcon,
        abbreviation: itemAbbreviations[id] ?? null,
        tier: item.tier,
        mass: item.mass,
        itemType: 'module',
        attributes,
    }
}

function hullCapsForEntity(
    itemId: number,
    decoded: Record<string, number>
): {
    hullmass: number
    capacity: number
} {
    switch (itemId) {
        case ITEM_SHIP_T1_PACKED:
            return computeShipHullCapabilities(decoded)
        case ITEM_WAREHOUSE_T1_PACKED:
            return computeWarehouseHullCapabilities(decoded)
        case ITEM_CONTAINER_T1_PACKED:
            return computeContainerCapabilities(decoded)
        case ITEM_CONTAINER_T2_PACKED:
            return computeContainerT2Capabilities(decoded)
        default:
            throw new Error(`resolveItem: no capacity formula wired for entity item ${itemId}`)
    }
}

function resolveEntity(
    id: number,
    stats?: UInt64Type,
    modules?: ServerContract.Types.module_entry[]
): ResolvedItem {
    const item = getItem(id)
    const layout = getEntityLayout(id)
    let attributes: ResolvedAttributeGroup[] | undefined
    let moduleSlots: ResolvedModuleSlot[] | undefined

    if (stats !== undefined) {
        const decoded = decodeCraftedItemStats(id, toBigStats(stats))
        const hullCaps = hullCapsForEntity(id, decoded)
        attributes = [
            {
                capability: 'Hull',
                attributes: [
                    {label: 'Mass', value: hullCaps.hullmass},
                    {label: 'Capacity', value: hullCaps.capacity},
                ],
            },
        ]
    }

    if (layout && layout.slots.length > 0) {
        const slotLabels = entityMetadata[id]?.moduleSlotLabels ?? []
        moduleSlots = layout.slots.map((slot, i) => {
            const mod = modules?.[i]
            if (mod?.installed) {
                const modItemId = Number(mod.installed.item_id.value.toString())
                const modStats = BigInt(mod.installed.stats.toString())
                const decodedStats = decodeCraftedItemStats(modItemId, modStats)
                const modType = getModuleCapabilityType(modItemId)
                const group = computeCapabilityGroup(modType, decodedStats)
                let modName = 'Module'
                try {
                    modName = getItem(modItemId).name
                } catch {
                    modName = itemMetadata[modItemId]?.name ?? 'Module'
                }
                return {
                    name: modName,
                    installed: true,
                    attributes: group?.attributes,
                }
            }
            return {
                name: slotLabels[i] ?? slot.type,
                installed: false,
            }
        })
    }

    return {
        itemId: id,
        name: item.name,
        icon: itemAbbreviations[id] ?? componentIcon,
        abbreviation: itemAbbreviations[id] ?? null,
        tier: item.tier,
        mass: item.mass,
        itemType: 'entity',
        attributes,
        moduleSlots,
    }
}

export function resolveItem(
    itemId: UInt16Type,
    stats?: UInt64Type,
    modules?: ServerContract.Types.module_entry[]
): ResolvedItem {
    const id = toNum(itemId)
    const item = getItem(id)

    if (item.type === 'module' || isModuleItem(id)) return resolveModule(id, stats)
    if (item.type === 'component') return resolveComponent(id, stats)
    if (item.type === 'entity') return resolveEntity(id, stats, modules)
    return resolveResource(id, stats)
}
