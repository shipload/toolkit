import {UInt16, UInt64} from '@wharfkit/antelope'
import type {UInt16Type, UInt64Type} from '@wharfkit/antelope'
import type {ResourceCategory, ResourceTier} from '../types'
import {getItem} from '../market/items'
import {getComponentById, getModuleRecipeByItemId, getEntityRecipeByItemId} from '../data/recipes'
import {isModuleItem, getModuleCapabilityType, MODULE_ENGINE, MODULE_GENERATOR, MODULE_EXTRACTOR, MODULE_LOADER, MODULE_CRAFTER} from '../capabilities/modules'
import {decodeCraftedItemStats} from '../derivation/crafting'
import {deriveResourceStats} from '../derivation/stratum'
import {getStatDefinitions} from '../derivation/stats'
import {computeShipHullCapabilities, computeEngineCapabilities, computeGeneratorCapabilities, computeExtractorCapabilities, computeLoaderCapabilities, computeManufacturingCapabilities} from '../entities/ship-deploy'
import {computeContainerCapabilities} from '../entities/container'
import {categoryColors, categoryIcons, componentIcon, moduleIcon} from '../data/colors'
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

export interface ResolvedItem {
    itemId: number
    name: string
    icon: string
    category?: ResourceCategory
    tier: ResourceTier
    mass: number
    itemType: ResolvedItemType
    stats?: ResolvedItemStat[]
    attributes?: ResolvedAttributeGroup[]
}

function toNum(v: UInt16Type): number {
    return Number(UInt16.from(v).value.toString())
}

function toBigSeed(v: UInt64Type): bigint {
    return BigInt(UInt64.from(v).toString())
}

function resolveResource(id: number, seed?: UInt64Type): ResolvedItem {
    const item = getItem(id)
    const cat = item.category
    let stats: ResolvedItemStat[] | undefined
    if (seed !== undefined) {
        const derived = deriveResourceStats(toBigSeed(seed))
        const defs = getStatDefinitions(cat)
        const values = [derived.stat1, derived.stat2, derived.stat3]
        stats = defs.map((d, i) => ({
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
        category: cat,
        tier: item.tier,
        mass: Number(item.mass.value.toString()),
        itemType: 'resource',
        stats,
    }
}

function resolveComponent(id: number, seed?: UInt64Type): ResolvedItem {
    const comp = getComponentById(id)!
    let stats: ResolvedItemStat[] | undefined
    if (seed !== undefined) {
        const decoded = decodeCraftedItemStats(id, toBigSeed(seed))
        stats = Object.entries(decoded).map(([key, value]) => {
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
        icon: componentIcon,
        tier: 't1' as ResourceTier,
        mass: comp.mass,
        itemType: 'component',
        stats,
    }
}

function computeCapabilityGroup(moduleType: number, stats: Record<string, number>): ResolvedAttributeGroup | undefined {
    switch (moduleType) {
        case MODULE_ENGINE: {
            const caps = computeEngineCapabilities(stats)
            return {capability: 'Engine', attributes: [
                {label: 'Thrust', value: caps.thrust},
                {label: 'Drain', value: caps.drain},
            ]}
        }
        case MODULE_GENERATOR: {
            const caps = computeGeneratorCapabilities(stats)
            return {capability: 'Generator', attributes: [
                {label: 'Capacity', value: caps.capacity},
                {label: 'Recharge', value: caps.recharge},
            ]}
        }
        case MODULE_EXTRACTOR: {
            const caps = computeExtractorCapabilities(stats)
            return {capability: 'Extractor', attributes: [
                {label: 'Rate', value: caps.rate},
                {label: 'Drain', value: caps.drain},
                {label: 'Depth', value: caps.depth},
                {label: 'Drill', value: caps.drill},
            ]}
        }
        case MODULE_LOADER: {
            const caps = computeLoaderCapabilities(stats)
            return {capability: 'Loader', attributes: [
                {label: 'Mass', value: caps.mass},
                {label: 'Thrust', value: caps.thrust},
                {label: 'Quantity', value: caps.quantity},
            ]}
        }
        case MODULE_CRAFTER: {
            const caps = computeManufacturingCapabilities(stats)
            return {capability: 'Manufacturing', attributes: [
                {label: 'Speed', value: caps.speed},
                {label: 'Drain', value: caps.drain},
            ]}
        }
        default:
            return undefined
    }
}

function resolveModule(id: number, seed?: UInt64Type): ResolvedItem {
    const recipe = getModuleRecipeByItemId(id)!
    let attributes: ResolvedAttributeGroup[] | undefined
    if (seed !== undefined) {
        const stats = decodeCraftedItemStats(id, toBigSeed(seed))
        const modType = getModuleCapabilityType(id)
        const group = computeCapabilityGroup(modType, stats)
        if (group) attributes = [group]
    }
    return {
        itemId: id,
        name: recipe.name,
        icon: moduleIcon,
        tier: 't1' as ResourceTier,
        mass: 0,
        itemType: 'module',
        attributes,
    }
}

function resolveEntity(id: number, seed?: UInt64Type, modules?: ServerContract.Types.module_entry[]): ResolvedItem {
    const recipe = getEntityRecipeByItemId(id)!
    let attributes: ResolvedAttributeGroup[] | undefined
    if (seed !== undefined) {
        const stats = decodeCraftedItemStats(id, toBigSeed(seed))
        attributes = []

        const isShip = recipe.id === 'ship-t1'
        if (isShip) {
            const hullCaps = computeShipHullCapabilities(stats)
            attributes.push({capability: 'Hull', attributes: [
                {label: 'Mass', value: hullCaps.hullmass},
                {label: 'Capacity', value: hullCaps.capacity},
            ]})
        } else {
            const containerCaps = computeContainerCapabilities(stats)
            attributes.push({capability: 'Hull', attributes: [
                {label: 'Mass', value: containerCaps.hullmass},
                {label: 'Capacity', value: containerCaps.capacity},
            ]})
        }

        if (modules) {
            for (const mod of modules) {
                if (!mod.installed) continue
                const modItemId = Number(mod.installed.item_id.value.toString())
                const modSeed = BigInt(mod.installed.seed.toString())
                const modStats = decodeCraftedItemStats(modItemId, modSeed)
                const modType = getModuleCapabilityType(modItemId)
                const group = computeCapabilityGroup(modType, modStats)
                if (group) attributes.push(group)
            }
        }
    }
    return {
        itemId: id,
        name: recipe.name,
        icon: componentIcon,
        tier: 't1' as ResourceTier,
        mass: 0,
        itemType: 'entity',
        attributes,
    }
}

export function resolveItem(
    itemId: UInt16Type,
    seed?: UInt64Type,
    modules?: ServerContract.Types.module_entry[]
): ResolvedItem {
    const id = toNum(itemId)

    if (isModuleItem(id)) return resolveModule(id, seed)

    if (getComponentById(id)) return resolveComponent(id, seed)

    if (getEntityRecipeByItemId(id)) return resolveEntity(id, seed, modules)

    return resolveResource(id, seed)
}
