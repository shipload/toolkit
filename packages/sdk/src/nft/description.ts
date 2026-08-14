import {
    getModuleCapabilityType,
    MODULE_BUILDER,
    MODULE_CRAFTER,
    MODULE_ENGINE,
    MODULE_GATHERER,
    MODULE_GENERATOR,
    MODULE_BATTERY,
    MODULE_HAULER,
    MODULE_LOADER,
    MODULE_STORAGE,
    MODULE_WARP,
} from '../capabilities/modules'
import {getKindMeta, getTemplateMeta} from '../data/kind-registry'
import {decodeStat} from '../derivation/crafting'
import {
    gathererDepthForTier,
    computeGathererYield,
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
} from '../derivation/capabilities'
import {getItem, tryGetItem} from '../data/catalog'
import type {ModuleType} from '../types'
import {ENTITY_SHIP, getPackedEntityType} from '../data/kind-registry'
import {getBaseHullmassFor} from '../derivation/capabilities'
import {computeEffectiveModuleStat} from '../derivation/stat-scaling'

function idiv(a: number, b: number): number {
    return Math.floor(a / b)
}

export function toWholeEnergy(milli: number): number {
    return idiv(milli + 500, 1000)
}

export function formatMassTonnes(kg: number): string {
    const tenths = idiv(kg + 50, 100)
    return `${idiv(tenths, 10)}.${tenths % 10} t`
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
    return Math.floor(5_000_000 * 6 ** (sumPackedShipChannels(stats) / 4995))
}

export function computeBaseCapacityContainer(stats: bigint): number {
    const s = decodeStat(stats, 0) + decodeStat(stats, 2)
    return Math.floor(22_000_000 * 6 ** (s / 1998))
}

export function computeBaseCapacityWarehouse(stats: bigint): number {
    const s = decodeStat(stats, 0) + decodeStat(stats, 2)
    return Math.floor(100_000_000 * 6 ** (s / 1998))
}

export function computeBaseCapacityWorkshop(stats: bigint): number {
    const s = decodeStat(stats, 0) + decodeStat(stats, 2)
    return Math.floor(5_000_000 * 6 ** (s / 1998))
}

const CAPACITY_FN_BY_KIND: Record<string, (stats: bigint) => number> = {
    ship: computeBaseCapacityShip,
    warehouse: computeBaseCapacityWarehouse,
    workshop: computeBaseCapacityWorkshop,
    extractor: computeBaseCapacityContainer,
    factory: computeBaseCapacityContainer,
    builddock: computeBaseCapacityContainer,
    mdriver: computeBaseCapacityContainer,
    mcatcher: computeBaseCapacityContainer,
    container: computeBaseCapacityContainer,
    nexus: computeBaseCapacityContainer,
}

export function computeBaseCapacityForEntity(itemId: number, stats: bigint): number {
    const kind = getTemplateMeta(itemId)?.kind
    if (!kind) return 0
    return CAPACITY_FN_BY_KIND[kind.toString()]?.(stats) ?? 0
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
export const computeGeneratorCap = (com: number, tier: number): number =>
    idiv((1_300_000 + com * 500) * moduleTierPct(GENERATOR_CAPACITY_TIER_PCT, tier), 100)
export const computeGeneratorRech = (fin: number, tier: number): number =>
    idiv((2000 + fin * 6) * moduleTierPct(GENERATOR_RECHARGE_TIER_PCT, tier), 100)
export const computeGathererDrain = (con: number): number =>
    2 * Math.max(250_000, 1_250_000 - con * 1250)
export const computeGathererDepth = (tol: number, tier: number): number =>
    gathererDepthForTier(tol, tier)
export const computeLoaderMass = (ins: number): number => Math.max(200, 2000 - ins * 2)
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
export const computeHaulerCapacity = (fin: number, tier: number): number =>
    Math.max(tier, tier + idiv(fin, 400))
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
export const computeCargoBayCapacity = (
    strength: number,
    density: number,
    hardness: number,
    tier: number
): number =>
    idiv(
        (10_000_000 + idiv((strength + density + hardness) * 50_000_000, 2997)) *
            moduleTierPct(CARGO_BAY_CAPACITY_TIER_PCT, tier),
        100
    )
export const computeBatteryBankCapacity = (
    volatility: number,
    thermal: number,
    plasticity: number,
    insulation: number,
    tier: number
): number =>
    idiv(
        (2_500_000 + idiv((volatility + thermal + plasticity + insulation) * 7_500_000, 3996)) *
            moduleTierPct(BATTERY_CAPACITY_TIER_PCT, tier),
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

export function formatModuleLine(slot: number, itemId: number, stats: bigint): string {
    let out = `Slot ${slot} - `
    if (itemId === 0) {
        out += '(empty)'
        return out
    }

    out += moduleDisplayName(itemId)
    const subtype = getModuleCapabilityType(itemId)

    switch (subtype) {
        case MODULE_ENGINE: {
            const vol = computeEffectiveModuleStat(decodeStat(stats, 0))
            const thm = computeEffectiveModuleStat(decodeStat(stats, 1))
            const tier = getItem(itemId).tier
            out += `  Thrust ${computeEngineThrust(vol, tier)}  Drain ${computeEngineDrain(thm)}`
            break
        }
        case MODULE_GENERATOR: {
            const res = computeEffectiveModuleStat(decodeStat(stats, 0))
            const ref = computeEffectiveModuleStat(decodeStat(stats, 1))
            const tier = getItem(itemId).tier
            out += `  Capacity ${toWholeEnergy(computeGeneratorCap(res, tier))}  Recharge ${toWholeEnergy(
                computeGeneratorRech(ref, tier)
            )}`
            break
        }
        case MODULE_GATHERER: {
            const str = decodeStat(stats, 0)
            const tol = decodeStat(stats, 1)
            const con = decodeStat(stats, 2)
            const tier = getItem(itemId).tier
            out += `  Yield ${computeGathererYield(str, tier)}  Depth ${computeGathererDepth(
                tol,
                tier
            )}  Drain ${toWholeEnergy(computeGathererDrain(con))}`
            break
        }
        case MODULE_LOADER: {
            const fin = decodeStat(stats, 0)
            const pla = decodeStat(stats, 1)
            const tier = getItem(itemId).tier
            out += `  Mass ${formatMassTonnes(computeLoaderMass(fin))}  Thrust ${computeLoaderThrust(pla, tier)}`
            break
        }
        case MODULE_CRAFTER: {
            const rea = decodeStat(stats, 0)
            const con = decodeStat(stats, 1)
            const tier = getItem(itemId).tier
            out += `  Speed ${computeCrafterSpeed(rea, tier)}  Drain ${toWholeEnergy(computeCrafterDrain(con))}`
            break
        }
        case MODULE_BUILDER: {
            const res = decodeStat(stats, 0)
            const fin = decodeStat(stats, 1)
            const tier = getItem(itemId).tier
            out += `  Speed ${computeBuilderSpeed(res, tier)}  Drain ${toWholeEnergy(computeBuilderDrain(fin))}`
            break
        }
        case MODULE_STORAGE: {
            const str = decodeStat(stats, 0)
            const den = decodeStat(stats, 1)
            const hrd = decodeStat(stats, 2)
            const coh = decodeStat(stats, 3)
            const tier = getItem(itemId).tier
            out += `  Cargo Capacity ${formatMassTonnes(computeCargoBayCapacity(str, den, hrd, tier))}  Drain ${toWholeEnergy(computeCargoBayDrain(coh, tier))}`
            break
        }
        case MODULE_HAULER: {
            const res = decodeStat(stats, 0)
            const pla = decodeStat(stats, 1)
            const con = decodeStat(stats, 2)
            const tier = getItem(itemId).tier
            out += `  Capacity ${computeHaulerCapacity(res, tier)}  Efficiency ${computeHaulerEfficiency(pla)}  Drain ${toWholeEnergy(computeHaulerDrain(con, tier))}`
            break
        }
        case MODULE_WARP: {
            const stat = decodeStat(stats, 0)
            const tier = getItem(itemId).tier
            out += `  Range ${computeWarpRange(stat, tier)}`
            break
        }
        case MODULE_BATTERY: {
            const vol = decodeStat(stats, 0)
            const thm = decodeStat(stats, 1)
            const pla = decodeStat(stats, 2)
            const ins = decodeStat(stats, 3)
            const tier = getItem(itemId).tier
            out += `  Energy Capacity ${toWholeEnergy(computeBatteryBankCapacity(vol, thm, pla, ins, tier))}`
            break
        }
    }
    return out
}

export function buildEntityDescription(
    itemId: number,
    hullStats: bigint,
    moduleItems: number[],
    moduleStats: bigint[]
): string {
    const hullMass = computeBaseHullmass(itemId, hullStats)
    const baseCapacity = computeBaseCapacityForEntity(itemId, hullStats)

    let out = entityDisplayName(itemId)
    out += ` - Hull ${formatMassTonnes(hullMass)}`
    if (baseCapacity > 0) {
        out += ` * ${formatMassTonnes(baseCapacity)} capacity`
    }
    out += '\n\n'

    for (let i = 0; i < moduleItems.length; i++) {
        out += formatModuleLine(i, moduleItems[i], moduleStats[i] ?? 0n)
        out += '\n'
    }

    return out
}
