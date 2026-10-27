import {getKindMeta, getTemplateMeta} from '../data/kind-registry'
import {decodeCraftedItemStats, decodeStat} from '../derivation/crafting'
import {
    gathererDepthForTier,
    moduleTierPct,
    ENGINE_THRUST_TIER_PCT,
    GENERATOR_CAPACITY_TIER_PCT,
    GENERATOR_RECHARGE_TIER_PCT,
    CRAFTER_SPEED_TIER_PCT,
    BUILDER_SPEED_TIER_PCT,
    WARP_RANGE_TIER_PCT,
    LOADER_THRUST_TIER_PCT,
    CARGO_BAY_CAPACITY_TIER_PCT,
    BATTERY_CAPACITY_TIER_PCT,
    STRUCTURE_BASE_CAPACITY,
    WAREHOUSE_BASE_CAPACITY,
} from '../derivation/capabilities'
import {getItem, tryGetItem} from '../data/catalog'
import type {ModuleType} from '../types'
import {ENTITY_SHIP, getPackedEntityType} from '../data/kind-registry'
import {getBaseHullmassFor} from '../derivation/capabilities'
import {computeGeneratorResonanceCapacity} from '../derivation/stat-scaling'

function idiv(a: number, b: number): number {
    return Math.floor(a / b)
}

export function toWholeEnergy(milli: number): number {
    return idiv(milli + 500, 1000)
}

function isShipHull(itemId: number): boolean {
    return getPackedEntityType(itemId)?.equals(ENTITY_SHIP) ?? false
}

function sumPackedShipChannels(stats: bigint): number {
    let sum = 0
    for (let slot = 0; slot < 5; slot++) sum += decodeStat(stats, slot)
    return sum
}

export function computeBaseHullmass(itemId: number, stats: bigint): number {
    if (isShipHull(itemId)) {
        return Math.floor(
            (getBaseHullmassFor(itemId) * (10_000 - sumPackedShipChannels(stats))) / 10_000
        )
    }
    const density = decodeStat(stats, 1)
    return Math.floor((getBaseHullmassFor(itemId) * (2000 - density)) / 2000)
}

export function computeBaseCapacityShip(stats: bigint): number {
    return Math.floor(50_000 * 6 ** (sumPackedShipChannels(stats) / 4995))
}

export function computeBaseCapacityContainer(stats: bigint): number {
    const s = decodeStat(stats, 0) + decodeStat(stats, 2)
    return Math.floor(141_000 * 6 ** (s / 1998))
}

export function computeBaseCapacityStructure(_stats: bigint): number {
    return STRUCTURE_BASE_CAPACITY
}

export function computeBaseCapacityWarehouse(_stats: bigint): number {
    return WAREHOUSE_BASE_CAPACITY
}

export function computeBaseCapacityDepot(stats: bigint): number {
    const s = decodeStat(stats, 0) + decodeStat(stats, 2)
    return Math.floor(500_000 * 6 ** (s / 1998))
}

export const computeEngineThrust = (vol: number, tier: number): number =>
    idiv((400 + idiv(vol * 3, 4)) * moduleTierPct(ENGINE_THRUST_TIER_PCT, tier), 100)
export const computeEngineDrain = (thm: number): number => 2 * Math.max(30, 50 - idiv(thm, 70))
export const ENGINE_DRAIN_BASE = 156
export const ENGINE_DRAIN_REF_THRUST = 775
export const ENGINE_DRAIN_REF_THM = 500

export const computeTravelDrain = (totalThrust: number, avgThm: number): number => {
    if (totalThrust <= 0) return 0
    const thermalFactor = computeEngineDrain(avgThm) / computeEngineDrain(ENGINE_DRAIN_REF_THM)
    const thrustFactor = Math.sqrt(ENGINE_DRAIN_REF_THRUST / totalThrust)
    return Math.floor(ENGINE_DRAIN_BASE * 1000 * thermalFactor * thrustFactor)
}
export const computeGeneratorCap = (resonance: number, tier: number): number =>
    idiv(
        (1_300_000 + computeGeneratorResonanceCapacity(resonance)) *
            moduleTierPct(GENERATOR_CAPACITY_TIER_PCT, tier),
        100
    )
export const computeGeneratorRech = (fin: number, tier: number): number =>
    idiv((2000 + fin * 6) * moduleTierPct(GENERATOR_RECHARGE_TIER_PCT, tier), 100)
export const computeGathererDrain = (con: number): number =>
    2 * Math.max(250_000, 1_250_000 - con * 1250)
export const computeGathererDepth = (tol: number, tier: number): number =>
    gathererDepthForTier(tol, tier)
export {computeLoaderPayload, calcShuttleMass} from '../derivation/capabilities'
export const computeLoaderThrust = (pla: number, tier: number): number =>
    idiv((1 + idiv(pla * pla, 10000)) * moduleTierPct(LOADER_THRUST_TIER_PCT, tier), 100)
export const computeCrafterSpeed = (rea: number, tier: number): number =>
    idiv((100 + idiv(rea * 4, 5)) * moduleTierPct(CRAFTER_SPEED_TIER_PCT, tier), 100)
export const computeCrafterDrain = (fin: number): number =>
    Math.max(5000, 30000 - idiv(fin * 1000, 33))
export const computeBuilderSpeed = (resonance: number, tier: number): number =>
    idiv((100 + idiv(resonance * 4, 5)) * moduleTierPct(BUILDER_SPEED_TIER_PCT, tier), 100)
export const computeBuilderDrain = (fineness: number): number =>
    Math.max(5000, 30000 - idiv(fineness * 1000, 33))
export const computeHaulerCapacity = (stat: number, tier: number): number =>
    Math.min(1 + idiv(stat * (tier + 2), 1350), 2 + idiv(Math.max(tier, 1) - 1, 3))
export const computeHaulerEfficiency = (con: number): number => 2000 + con * 6
export const supportDrainTierPercent = (tier: number): number => {
    const clampedTier = Math.min(10, Math.max(1, Math.trunc(tier)))
    return Math.max(50, 110 - clampedTier * 10)
}
const computeT1LogisticsDrain = (stat: number): number =>
    Math.max(3000, 15000 - Math.min(12000, idiv(stat * 1000, 80)))
export const computeHaulerDrain = (conductivity: number, tier: number): number =>
    idiv(computeT1LogisticsDrain(conductivity) * supportDrainTierPercent(tier), 100)
export const computeCargoBayDrain = (cohesion: number, tier: number): number =>
    idiv(computeT1LogisticsDrain(cohesion) * 3 * supportDrainTierPercent(tier), 400)
export const computeWarpRange = (stat: number, tier: number): number =>
    idiv((100 + stat * 3) * moduleTierPct(WARP_RANGE_TIER_PCT, tier), 100)
export const computeCargoBayCapacity = (stat: number, tier: number): number =>
    idiv(
        (100_000 + idiv(stat * 500_000, 999)) * moduleTierPct(CARGO_BAY_CAPACITY_TIER_PCT, tier),
        100
    )
export const computeBatteryBankCapacity = (stat: number, tier: number): number =>
    idiv(
        (2_500_000 + idiv(stat * 7_500_000, 999)) * moduleTierPct(BATTERY_CAPACITY_TIER_PCT, tier),
        100
    )

export function entityDisplayName(itemId: number): string {
    const template = getTemplateMeta(itemId)
    if (!template) return 'Entity'
    if (template.displayLabel) return template.displayLabel
    return getKindMeta(template.kind)?.defaultLabel || 'Entity'
}

const MODULE_DISPLAY_NAME_BY_TYPE: Partial<Record<ModuleType, string>> = {
    engine: 'Engine',
    generator: 'Power Core',
    gatherer: 'Limpet Bay',
    loader: 'Shuttle Bay',
    crafter: 'Fabricator',
    storage: 'Cargo Hold',
    hauler: 'Tractor Beam',
    warp: 'Warp Drive',
    battery: 'Battery Bank',
    launcher: 'Drive Coil',
    builder: 'Assembly Arm',
}

export function moduleDisplayName(itemId: number): string {
    const item = tryGetItem(itemId)
    if (item?.type !== 'module' || !item.moduleType) return 'Module'
    return MODULE_DISPLAY_NAME_BY_TYPE[item.moduleType] ?? 'Module'
}

export function formatLoadoutLine(slot: number, itemId: number, stats: bigint): string {
    const label = `Slot ${slot + 1}: `
    if (itemId === 0) return `${label}empty`
    const named = Object.entries(decodeCraftedItemStats(itemId, stats))
    const statText =
        named.length > 0 ? ` (${named.map(([key, value]) => `${key} ${value}`).join(', ')})` : ''
    return `${label}${moduleDisplayName(itemId)} T${getItem(itemId).tier}${statText}`
}

export function buildEntityLoadout(moduleItems: number[], moduleStats: bigint[]): string {
    return moduleItems
        .map((itemId, i) => formatLoadoutLine(i, itemId, moduleStats[i] ?? 0n))
        .join('\n')
}
