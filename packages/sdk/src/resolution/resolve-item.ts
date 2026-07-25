import {UInt16, UInt64} from '@wharfkit/antelope'
import type {UInt16Type, UInt64Type} from '@wharfkit/antelope'
import type {ResourceCategory} from '../types'
import {getItem, getModules} from '../data/catalog'
import {ENTITY_SHIP, getPackedEntityType} from '../data/kind-registry'
import {getEntityLayout} from '../data/recipes-runtime'
import {entityMetadata, itemMetadata} from '../data/metadata'
import {
    getModuleCapabilityType,
    isModuleItem,
    MODULE_BUILDER,
    MODULE_CRAFTER,
    MODULE_ENGINE,
    MODULE_BATTERY,
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
    computeBuilderCapabilities,
    computeBatteryCapabilities,
    computeEngineCapabilities,
    computeGathererCapabilities,
    computeGeneratorCapabilities,
    computeHaulerCapabilities,
    computeLoaderCapabilities,
    computeBaseCapacity,
    computeBaseHullmass,
    computeStorageCapabilities,
} from '../derivation/capabilities'
import {applySlotMultiplierUint32} from '../entities/slot-multiplier'
import {toWholeEnergy} from '../nft/description'
import {categoryColors, componentIcon, itemAbbreviations, moduleIcon} from '../data/colors'
import type {ServerContract} from '../contracts'

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
    capability?: string
    installed: boolean
    attributes?: {label: string; value: number}[]
    slotLabel?: string
    slotType?: string
    outputPct?: number
    maxTier?: number
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
        icon: '',
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
    stats: Record<string, number>,
    tier: number,
    outputPct = 100
): ResolvedAttributeGroup | undefined {
    switch (moduleType) {
        case MODULE_ENGINE: {
            const caps = computeEngineCapabilities(stats, tier)
            return {
                capability: 'Engine',
                attributes: [
                    {label: 'Thrust', value: caps.thrust},
                    {label: 'Drain', value: caps.drain},
                ],
            }
        }
        case MODULE_GENERATOR: {
            const caps = computeGeneratorCapabilities(stats, tier)
            return {
                capability: 'Generator',
                attributes: [
                    {label: 'Capacity', value: toWholeEnergy(caps.capacity)},
                    {label: 'Recharge', value: toWholeEnergy(caps.recharge)},
                ],
            }
        }
        case MODULE_GATHERER: {
            const caps = computeGathererCapabilities(stats, tier)
            return {
                capability: 'Gatherer',
                attributes: [
                    {label: 'Yield', value: caps.yield},
                    {label: 'Drain', value: toWholeEnergy(caps.drain)},
                    {label: 'Depth', value: caps.depth},
                ],
            }
        }
        case MODULE_LOADER: {
            const caps = computeLoaderCapabilities(stats, tier)
            return {
                capability: 'Loading',
                attributes: [
                    {label: 'Mass', value: caps.mass},
                    {label: 'Thrust', value: caps.thrust},
                    {label: 'Quantity', value: caps.quantity},
                ],
            }
        }
        case MODULE_CRAFTER: {
            const caps = computeCrafterCapabilities(stats, tier)
            return {
                capability: 'Crafting',
                attributes: [
                    {label: 'Speed', value: caps.speed},
                    {label: 'Drain', value: toWholeEnergy(caps.drain)},
                ],
            }
        }
        case MODULE_BUILDER: {
            const caps = computeBuilderCapabilities(stats, tier)
            return {
                capability: 'Build',
                attributes: [
                    {label: 'Speed', value: caps.speed},
                    {label: 'Drain', value: toWholeEnergy(caps.drain)},
                ],
            }
        }
        case MODULE_HAULER: {
            const caps = computeHaulerCapabilities(stats, tier)
            return {
                capability: 'Hauling',
                attributes: [
                    {label: 'Capacity', value: caps.capacity},
                    {label: 'Efficiency', value: caps.efficiency},
                    {label: 'Drain', value: toWholeEnergy(caps.drain)},
                ],
            }
        }
        case MODULE_STORAGE: {
            const caps = computeStorageCapabilities(stats, tier)
            return {
                capability: 'Storage',
                attributes: [
                    {
                        label: 'Cargo Capacity',
                        value: applySlotMultiplierUint32(caps.capacity, outputPct),
                    },
                    {label: 'Drain', value: toWholeEnergy(caps.drain)},
                ],
            }
        }
        case MODULE_BATTERY: {
            const caps = computeBatteryCapabilities(stats, tier)
            return {
                capability: 'Energy',
                attributes: [
                    {
                        label: 'Energy Capacity',
                        value: toWholeEnergy(applySlotMultiplierUint32(caps.capacity, outputPct)),
                    },
                ],
            }
        }
        default:
            return undefined
    }
}

// Recipe-less higher-tier modules reuse the T1 stat layout of their module type.
function decodeModuleStats(id: number, big: bigint): Record<string, number> {
    const decoded = decodeCraftedItemStats(id, big)
    if (Object.keys(decoded).length > 0) return decoded
    const moduleType = getItem(id).moduleType
    if (!moduleType) return decoded
    const t1 = getModules({moduleType, tier: 1})[0]
    if (!t1) return decoded
    return decodeCraftedItemStats(Number(t1.id), big)
}

function resolveModule(id: number, stats?: UInt64Type): ResolvedItem {
    const item = getItem(id)
    let attributes: ResolvedAttributeGroup[] | undefined
    if (stats !== undefined) {
        const decoded = decodeModuleStats(id, toBigStats(stats))
        const modType = getModuleCapabilityType(id)
        const group = computeCapabilityGroup(modType, decoded, item.tier)
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
    decoded: Record<string, number>,
    packedStats: bigint
): {
    hullmass: number
    capacity: number
} {
    // A ship hull consumes all five positional packed channels. This is separate
    // from the recipe-facing stat labels, which remain historical for Ship T1.
    const hullStats = getPackedEntityType(itemId)?.equals(ENTITY_SHIP)
        ? {
              strength: decodeStat(packedStats, 0),
              hardness: decodeStat(packedStats, 1),
              plasticity: decodeStat(packedStats, 2),
              volatility: decodeStat(packedStats, 3),
              conductivity: decodeStat(packedStats, 4),
          }
        : decoded
    return {
        hullmass: computeBaseHullmass(itemId, hullStats),
        capacity: computeBaseCapacity(itemId, hullStats),
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
        const bigStats = toBigStats(stats)
        const decoded = decodeCraftedItemStats(id, bigStats)
        if (decoded.strength === undefined) decoded.strength = decodeStat(bigStats, 0)
        if (decoded.density === undefined) decoded.density = decodeStat(bigStats, 1)
        if (decoded.hardness === undefined) decoded.hardness = decodeStat(bigStats, 2)
        const hullCaps = hullCapsForEntity(id, decoded, bigStats)
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
            const slotInfo = {
                slotLabel: slotLabels[i] ?? slot.type,
                slotType: slot.type,
                outputPct: slot.outputPct,
                maxTier: slot.maxTier,
            }
            const mod = modules?.[i]
            if (mod?.installed) {
                const modItemId = Number(mod.installed.item_id.value.toString())
                const modStats = BigInt(mod.installed.stats.toString())
                const decodedStats = decodeModuleStats(modItemId, modStats)
                const modType = getModuleCapabilityType(modItemId)
                let modName = 'Module'
                let modTier = 1
                try {
                    const modItem = getItem(modItemId)
                    modName = modItem.name
                    modTier = modItem.tier
                } catch {
                    modName = itemMetadata[modItemId]?.name ?? 'Module'
                }
                const group = computeCapabilityGroup(modType, decodedStats, modTier, slot.outputPct)
                return {
                    name: modName,
                    capability: group?.capability,
                    installed: true,
                    attributes: group?.attributes,
                    ...slotInfo,
                }
            }
            return {
                name: slotLabels[i] ?? slot.type,
                installed: false,
                ...slotInfo,
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
