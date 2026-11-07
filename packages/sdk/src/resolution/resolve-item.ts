import {UInt16, UInt64} from '@wharfkit/antelope'
import type {UInt16Type, UInt64Type} from '@wharfkit/antelope'
import type {ResourceCategory} from '../types'
import {getItem, getModules, typeLabel} from '../data/catalog'
import {ENTITY_SHIP, getPackedEntityType} from '../data/kind-registry'
import {getEntityLayout} from '../data/recipes-runtime'
import {entityMetadata, getItemFamily, slotLabel} from '../data/metadata'
import {attributeLabel, capabilityLabel} from '../data/capabilities'
import type {ComponentProcess} from '../data/metadata'
import {getComponentProcess} from '../data/component-process'
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
import {decodeCraftedItemStats, decodeStat, getCarriedItemStatSlots} from '../derivation/crafting'
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
    computeBaseHullmassFromStats,
    computeStorageCapabilities,
    withPositionalModuleStats,
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

export interface ResolvedAttribute {
    key: string
    label: string
    value: number
}

export interface ResolvedAttributeGroup {
    key: string
    capability: string
    attributes: ResolvedAttribute[]
}

export type ResolvedItemType = 'resource' | 'component' | 'module' | 'entity'

export interface ResolvedModuleSlot {
    name?: string
    capabilityKey?: string
    capability?: string
    installed: boolean
    attributes?: ResolvedAttribute[]
    slotKey?: string
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
    process?: ComponentProcess
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
        const slotByKey = new Map(getCarriedItemStatSlots(id).map((slot) => [slot.key, slot]))
        resolvedStats = Object.entries(decoded)
            .filter(([key]) => slotByKey.has(key))
            .map(([key, value]) => {
                const slot = slotByKey.get(key)
                return {
                    key,
                    label: slot?.label ?? key,
                    abbreviation: slot?.abbreviation ?? key.slice(0, 3).toUpperCase(),
                    value,
                    color: '#9BADB8',
                    inverted: slot?.sources.length === 1 ? slot.sources[0].inverted : undefined,
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
        process: getComponentProcess(id),
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
                key: 'engine',
                capability: capabilityLabel('engine'),
                attributes: [
                    {key: 'thrust', label: attributeLabel('thrust'), value: caps.thrust},
                    {key: 'drain', label: attributeLabel('drain'), value: caps.drain},
                ],
            }
        }
        case MODULE_GENERATOR: {
            const caps = computeGeneratorCapabilities(stats, tier)
            return {
                key: 'generator',
                capability: capabilityLabel('generator'),
                attributes: [
                    {
                        key: 'capacity',
                        label: attributeLabel('capacity'),
                        value: toWholeEnergy(caps.capacity),
                    },
                    {
                        key: 'recharge',
                        label: attributeLabel('recharge'),
                        value: toWholeEnergy(caps.recharge * 60),
                    },
                ],
            }
        }
        case MODULE_GATHERER: {
            const caps = computeGathererCapabilities(stats, tier)
            return {
                key: 'gatherer',
                capability: capabilityLabel('gatherer'),
                attributes: [
                    {key: 'yield', label: attributeLabel('yield'), value: caps.yield},
                    {
                        key: 'drain',
                        label: attributeLabel('drain'),
                        value: toWholeEnergy(caps.drain),
                    },
                    {key: 'depth', label: attributeLabel('depth'), value: caps.depth},
                ],
            }
        }
        case MODULE_LOADER: {
            const caps = computeLoaderCapabilities(stats, tier)
            return {
                key: 'loading',
                capability: capabilityLabel('loading'),
                attributes: [
                    {key: 'payload', label: attributeLabel('payload'), value: caps.payload},
                    {key: 'thrust', label: attributeLabel('thrust'), value: caps.thrust},
                    {key: 'quantity', label: attributeLabel('quantity'), value: caps.quantity},
                ],
            }
        }
        case MODULE_CRAFTER: {
            const caps = computeCrafterCapabilities(stats, tier)
            return {
                key: 'crafting',
                capability: capabilityLabel('crafting'),
                attributes: [
                    {key: 'speed', label: attributeLabel('speed'), value: caps.speed},
                    {
                        key: 'drain',
                        label: attributeLabel('drain'),
                        value: toWholeEnergy(caps.drain),
                    },
                ],
            }
        }
        case MODULE_BUILDER: {
            const caps = computeBuilderCapabilities(stats, tier)
            return {
                key: 'build',
                capability: capabilityLabel('build'),
                attributes: [
                    {key: 'speed', label: attributeLabel('speed'), value: caps.speed},
                    {
                        key: 'drain',
                        label: attributeLabel('drain'),
                        value: toWholeEnergy(caps.drain),
                    },
                ],
            }
        }
        case MODULE_HAULER: {
            const caps = computeHaulerCapabilities(stats, tier)
            return {
                key: 'hauling',
                capability: capabilityLabel('hauling'),
                attributes: [
                    {key: 'capacity', label: attributeLabel('capacity'), value: caps.capacity},
                    {
                        key: 'efficiency',
                        label: attributeLabel('efficiency'),
                        value: caps.efficiency,
                    },
                    {
                        key: 'drain',
                        label: attributeLabel('drain'),
                        value: toWholeEnergy(caps.drain),
                    },
                ],
            }
        }
        case MODULE_STORAGE: {
            const caps = computeStorageCapabilities(stats, tier)
            return {
                key: 'storage',
                capability: capabilityLabel('storage'),
                attributes: [
                    {
                        key: 'cargo-capacity',
                        label: attributeLabel('cargo-capacity'),
                        value: applySlotMultiplierUint32(caps.capacity, outputPct),
                    },
                    {
                        key: 'drain',
                        label: attributeLabel('drain'),
                        value: toWholeEnergy(caps.drain),
                    },
                ],
            }
        }
        case MODULE_BATTERY: {
            const caps = computeBatteryCapabilities(stats, tier)
            return {
                key: 'energy',
                capability: capabilityLabel('energy'),
                attributes: [
                    {
                        key: 'energy-capacity',
                        label: attributeLabel('energy-capacity'),
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
    if (Object.keys(decoded).length > 0) return withPositionalModuleStats(id, big, decoded)
    const moduleType = getItem(id).moduleType
    if (!moduleType) return decoded
    const t1 = getModules({moduleType, tier: 1})[0]
    if (!t1) return decoded
    return withPositionalModuleStats(id, big, decodeCraftedItemStats(Number(t1.id), big))
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
        hullmass: computeBaseHullmassFromStats(itemId, hullStats),
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
                key: 'hull',
                capability: capabilityLabel('hull'),
                attributes: [
                    {key: 'mass', label: attributeLabel('mass'), value: hullCaps.hullmass},
                    {key: 'capacity', label: attributeLabel('capacity'), value: hullCaps.capacity},
                ],
            },
        ]
    }

    if (layout && layout.slots.length > 0) {
        const slotKeys = entityMetadata[id]?.moduleSlots ?? []
        moduleSlots = layout.slots.map((slot, i) => {
            const slotKey = slotKeys[i]
            const slotName = slotKey ? slotLabel(slotKey) : slot.type
            const slotInfo = {
                slotKey,
                slotLabel: slotName,
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
                let modName = typeLabel('module')
                let modTier = 1
                try {
                    const modItem = getItem(modItemId)
                    modName = modItem.name
                    modTier = modItem.tier
                } catch {
                    modName = getItemFamily(modItemId)?.name ?? typeLabel('module')
                }
                const group = computeCapabilityGroup(modType, decodedStats, modTier, slot.outputPct)
                return {
                    name: modName,
                    capabilityKey: group?.key,
                    capability: group?.capability,
                    installed: true,
                    attributes: group?.attributes,
                    ...slotInfo,
                }
            }
            return {
                name: slotName,
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
