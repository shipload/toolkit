import {UInt16, UInt64} from '@wharfkit/antelope'
import type {UInt16Type, UInt64Type} from '@wharfkit/antelope'
import type {ResourceCategory, ResourceTier} from '../types'
import {getItem} from '../market/items'
import {getComponentById, getEntityRecipeByItemId, getModuleRecipeByItemId} from '../data/recipes'
import {
    getModuleCapabilityType,
    isModuleItem,
    MODULE_CRAFTER,
    MODULE_ENGINE,
    MODULE_GATHERER,
    MODULE_GENERATOR,
    MODULE_LOADER,
    MODULE_STORAGE,
} from '../capabilities/modules'
import {decodeCraftedItemStats, decodeStat} from '../derivation/crafting'
import {getStatDefinitions} from '../derivation/stats'
import {
    computeEngineCapabilities,
    computeGathererCapabilities,
    computeGeneratorCapabilities,
    computeLoaderCapabilities,
    computeManufacturingCapabilities,
    computeShipHullCapabilities,
} from '../entities/ship-deploy'
import {computeContainerCapabilities} from '../entities/container'
import {categoryColors, categoryIcons, componentIcon, itemAbbreviations, moduleIcon} from '../data/colors'
import {ServerContract} from '../contracts'

export interface ResolvedItemStat {
    key: string
    label: string
    abbreviation: string
    value: number
    color: string
    category: ResourceCategory
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
    tier: ResourceTier
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
    if (stats !== undefined) {
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
        name: String(item.name),
        icon: categoryIcons[cat] ?? '⬡',
        abbreviation: null,
        category: cat,
        tier: item.tier,
        mass: Number(item.mass.value.toString()),
        itemType: 'resource',
        stats: resolvedStats,
    }
}

function resolveComponent(id: number, stats?: UInt64Type): ResolvedItem {
    const comp = getComponentById(id)!
    let resolvedStats: ResolvedItemStat[] | undefined
    if (stats !== undefined) {
        const decoded = decodeCraftedItemStats(id, toBigStats(stats))
        resolvedStats = Object.entries(decoded).map(([key, value]) => {
            const allDefs = getStatDefinitions('metal')
                .concat(getStatDefinitions('precious'))
                .concat(getStatDefinitions('gas'))
                .concat(getStatDefinitions('mineral'))
                .concat(getStatDefinitions('organic'))
            const def = allDefs.find((d) => d.key === key)
            const statDef = comp.stats.find((s) => s.key === key)
            const cat = (statDef?.source ?? 'metal') as ResourceCategory
            return {
                key,
                label: def?.label ?? key,
                abbreviation: def?.abbreviation ?? key.slice(0, 3).toUpperCase(),
                value,
                color: categoryColors[cat],
                category: cat,
                inverted: def?.inverted,
            }
        })
    }
    return {
        itemId: id,
        name: comp.name,
        icon: itemAbbreviations[id] ?? componentIcon,
        abbreviation: itemAbbreviations[id] ?? null,
        tier: 't1' as ResourceTier,
        mass: comp.mass,
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
            const caps = computeManufacturingCapabilities(stats)
            return {
                capability: 'Manufacturing',
                attributes: [
                    {label: 'Speed', value: caps.speed},
                    {label: 'Drain', value: caps.drain},
                ],
            }
        }
        case MODULE_STORAGE: {
            const str = stats.strength ?? 500
            const duc = stats.ductility ?? 500
            const pur = stats.purity ?? 500
            const statSum = str + duc + pur
            const pct = 10 + Math.floor((statSum * 10) / 2997)
            return {capability: 'Storage', attributes: [{label: 'Capacity Bonus', value: pct}]}
        }
        default:
            return undefined
    }
}

function resolveModule(id: number, stats?: UInt64Type): ResolvedItem {
    const recipe = getModuleRecipeByItemId(id)!
    let attributes: ResolvedAttributeGroup[] | undefined
    if (stats !== undefined) {
        const decoded = decodeCraftedItemStats(id, toBigStats(stats))
        const modType = getModuleCapabilityType(id)
        const group = computeCapabilityGroup(modType, decoded)
        if (group) attributes = [group]
    }
    return {
        itemId: id,
        name: recipe.name,
        icon: itemAbbreviations[id] ?? moduleIcon,
        abbreviation: itemAbbreviations[id] ?? null,
        tier: 't1' as ResourceTier,
        mass: 0,
        itemType: 'module',
        attributes,
    }
}

function resolveEntity(
    id: number,
    stats?: UInt64Type,
    modules?: ServerContract.Types.module_entry[]
): ResolvedItem {
    const recipe = getEntityRecipeByItemId(id)!
    let attributes: ResolvedAttributeGroup[] | undefined
    let moduleSlots: ResolvedModuleSlot[] | undefined

    if (stats !== undefined) {
        const decoded = decodeCraftedItemStats(id, toBigStats(stats))
        attributes = []

        const isShip = recipe.id === 'ship-t1'
        if (isShip) {
            const hullCaps = computeShipHullCapabilities(decoded)
            attributes.push({
                capability: 'Hull',
                attributes: [
                    {label: 'Mass', value: hullCaps.hullmass},
                    {label: 'Capacity', value: hullCaps.capacity},
                ],
            })
        } else {
            const containerCaps = computeContainerCapabilities(decoded)
            attributes.push({
                capability: 'Hull',
                attributes: [
                    {label: 'Mass', value: containerCaps.hullmass},
                    {label: 'Capacity', value: containerCaps.capacity},
                ],
            })
        }
    }

    if (recipe.moduleSlots) {
        moduleSlots = recipe.moduleSlots.map((slot, i) => {
            const mod = modules?.[i]
            if (mod?.installed) {
                const modItemId = Number(mod.installed.item_id.value.toString())
                const modStats = BigInt(mod.installed.stats.toString())
                const decodedStats = decodeCraftedItemStats(modItemId, modStats)
                const modType = getModuleCapabilityType(modItemId)
                const group = computeCapabilityGroup(modType, decodedStats)
                const modRecipe = getModuleRecipeByItemId(modItemId)
                return {
                    name: modRecipe?.name ?? 'Module',
                    installed: true,
                    attributes: group?.attributes,
                }
            }
            return {installed: false}
        })
    }

    return {
        itemId: id,
        name: recipe.name,
        icon: itemAbbreviations[id] ?? componentIcon,
        abbreviation: itemAbbreviations[id] ?? null,
        tier: 't1' as ResourceTier,
        mass: 0,
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

    if (isModuleItem(id)) return resolveModule(id, stats)

    if (getComponentById(id)) return resolveComponent(id, stats)

    if (getEntityRecipeByItemId(id)) return resolveEntity(id, stats, modules)

    return resolveResource(id, stats)
}
