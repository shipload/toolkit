import {
    getModuleCapabilityType,
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
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
    ITEM_CRAFTER_T1,
    ITEM_ENGINE_T1,
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_FACTORY_T1_PACKED,
    ITEM_GATHERER_T1,
    ITEM_GATHERER_T2,
    ITEM_GENERATOR_T1,
    ITEM_HAULER_SHIP_T2_PACKED,
    ITEM_HAULER_T1,
    ITEM_HAULER_T2,
    ITEM_BATTERY_T1,
    ITEM_LAUNCHER_T1,
    ITEM_LOADER_T1,
    ITEM_PROSPECTOR_T1_PACKED,
    ITEM_PROSPECTOR_T2_PACKED,
    ITEM_ROUSTABOUT_T1_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_STORAGE_T1,
    ITEM_TENDER_T1_PACKED,
    ITEM_TUG_T1_PACKED,
    ITEM_PORTER_T1_PACKED,
    ITEM_WRANGLER_T1_PACKED,
    ITEM_DREDGER_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
    ITEM_WARP_T1,
} from '../data/item-ids'
import {decodeStat} from '../derivation/crafting'
import {gathererDepthForTier} from '../derivation/capabilities'
import {getItem} from '../data/catalog'
import {getBaseHullmassFor} from '../derivation/capabilities'
import {computeEffectiveModuleStat} from '../derivation/stat-scaling'

function idiv(a: number, b: number): number {
    return Math.floor(a / b)
}

export function toWholeEnergy(milli: number): number {
    return idiv(milli + 500, 1000)
}

export function computeBaseHullmass(itemId: number, stats: bigint): number {
    const density = decodeStat(stats, 1)
    return Math.floor((getBaseHullmassFor(itemId) * (2000 - density)) / 2000)
}

export function computeBaseCapacityShip(stats: bigint): number {
    const s = decodeStat(stats, 0) + decodeStat(stats, 2)
    return Math.floor(5_000_000 * 6 ** (s / 1998))
}

export function computeBaseCapacityContainer(stats: bigint): number {
    const s = decodeStat(stats, 0) + decodeStat(stats, 2)
    return Math.floor(22_000_000 * 6 ** (s / 1998))
}

export function computeBaseCapacityWarehouse(stats: bigint): number {
    const s = decodeStat(stats, 0) + decodeStat(stats, 2)
    return Math.floor(100_000_000 * 6 ** (s / 1998))
}

export const computeEngineThrust = (vol: number): number => 400 + idiv(vol * 3, 4)
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
export const computeGeneratorCap = (com: number): number => 1_300_000 + com * 500
export const computeGeneratorRech = (fin: number): number => 2000 + fin * 6
export const computeGathererYield = (str: number): number => 200 + str
export const computeGathererDrain = (con: number): number =>
    2 * Math.max(250_000, 1_250_000 - con * 1250)
export const computeGathererDepth = (tol: number, tier: number): number =>
    gathererDepthForTier(tol, tier)
export const computeLoaderMass = (ins: number): number => Math.max(200, 2000 - ins * 2)
export const computeLoaderThrust = (pla: number): number => 1 + idiv(pla * pla, 10000)
export const computeCrafterSpeed = (rea: number): number => 100 + idiv(rea * 4, 5)
export const computeCrafterDrain = (fin: number): number =>
    Math.max(5000, 30000 - idiv(fin * 1000, 33))
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
export const computeWarpRange = (stat: number): number => 100 + stat * 3
export const computeCargoBayCapacity = (
    strength: number,
    density: number,
    hardness: number
): number => 10_000_000 + idiv((strength + density + hardness) * 50_000_000, 2997)
export const computeBatteryBankCapacity = (
    volatility: number,
    thermal: number,
    plasticity: number,
    insulation: number
): number => 2_500_000 + idiv((volatility + thermal + plasticity + insulation) * 7_500_000, 3996)

export function entityDisplayName(itemId: number): string {
    switch (itemId) {
        case ITEM_SHIP_T1_PACKED:
            return 'Ship'
        case ITEM_ROUSTABOUT_T1_PACKED:
            return 'Roustabout'
        case ITEM_PROSPECTOR_T1_PACKED:
            return 'Prospector'
        case ITEM_TENDER_T1_PACKED:
            return 'Tender'
        case ITEM_TUG_T1_PACKED:
            return 'Tug'
        case ITEM_PORTER_T1_PACKED:
            return 'Porter'
        case ITEM_WRANGLER_T1_PACKED:
            return 'Wrangler'
        case ITEM_DREDGER_T1_PACKED:
            return 'Dredger'
        case ITEM_WAREHOUSE_T1_PACKED:
            return 'Warehouse'
        case ITEM_EXTRACTOR_T1_PACKED:
            return 'Mining Rig'
        case ITEM_FACTORY_T1_PACKED:
            return 'Factory'
        case ITEM_CONTAINER_T1_PACKED:
            return 'Container'
        case ITEM_CONTAINER_T2_PACKED:
            return 'Container'
        case ITEM_PROSPECTOR_T2_PACKED:
            return 'Prospector'
        case ITEM_HAULER_SHIP_T2_PACKED:
            return 'Tug'
        default:
            return 'Entity'
    }
}

export function moduleDisplayName(itemId: number): string {
    switch (itemId) {
        case ITEM_ENGINE_T1:
            return 'Engine'
        case ITEM_GENERATOR_T1:
            return 'Power Core'
        case ITEM_GATHERER_T1:
        case ITEM_GATHERER_T2:
            return 'Limpet Bay'
        case ITEM_LOADER_T1:
            return 'Shuttle Bay'
        case ITEM_CRAFTER_T1:
            return 'Fabricator'
        case ITEM_STORAGE_T1:
            return 'Cargo Hold'
        case ITEM_HAULER_T1:
        case ITEM_HAULER_T2:
            return 'Tractor Beam'
        case ITEM_WARP_T1:
            return 'Warp Drive'
        case ITEM_BATTERY_T1:
            return 'Battery Bank'
        case ITEM_LAUNCHER_T1:
            return 'Drive Coil'
        default:
            return 'Module'
    }
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
            out += `  Thrust ${computeEngineThrust(vol)}  Drain ${computeEngineDrain(thm)}`
            break
        }
        case MODULE_GENERATOR: {
            const res = computeEffectiveModuleStat(decodeStat(stats, 0))
            const ref = computeEffectiveModuleStat(decodeStat(stats, 1))
            out += `  Capacity ${toWholeEnergy(computeGeneratorCap(res))}  Recharge ${toWholeEnergy(
                computeGeneratorRech(ref)
            )}`
            break
        }
        case MODULE_GATHERER: {
            const str = decodeStat(stats, 0)
            const tol = decodeStat(stats, 1)
            const con = decodeStat(stats, 2)
            const tier = getItem(itemId).tier
            out += `  Yield ${computeGathererYield(str)}  Depth ${computeGathererDepth(
                tol,
                tier
            )}  Drain ${toWholeEnergy(computeGathererDrain(con))}`
            break
        }
        case MODULE_LOADER: {
            const fin = decodeStat(stats, 0)
            const pla = decodeStat(stats, 1)
            out += `  Mass ${computeLoaderMass(fin)}  Thrust ${computeLoaderThrust(pla)}`
            break
        }
        case MODULE_CRAFTER: {
            const rea = decodeStat(stats, 0)
            const con = decodeStat(stats, 1)
            out += `  Speed ${computeCrafterSpeed(rea)}  Drain ${toWholeEnergy(computeCrafterDrain(con))}`
            break
        }
        case MODULE_STORAGE: {
            const str = decodeStat(stats, 0)
            const den = decodeStat(stats, 1)
            const hrd = decodeStat(stats, 2)
            const coh = decodeStat(stats, 3)
            const tier = getItem(itemId).tier
            out += `  Cargo Capacity ${computeCargoBayCapacity(str, den, hrd)}  Drain ${toWholeEnergy(computeCargoBayDrain(coh, tier))}`
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
            out += `  Range ${computeWarpRange(stat)}`
            break
        }
        case MODULE_BATTERY: {
            const vol = decodeStat(stats, 0)
            const thm = decodeStat(stats, 1)
            const pla = decodeStat(stats, 2)
            const ins = decodeStat(stats, 3)
            out += `  Energy Capacity ${toWholeEnergy(computeBatteryBankCapacity(vol, thm, pla, ins))}`
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
    let baseCapacity = 0
    if (
        itemId === ITEM_SHIP_T1_PACKED ||
        itemId === ITEM_ROUSTABOUT_T1_PACKED ||
        itemId === ITEM_PROSPECTOR_T1_PACKED ||
        itemId === ITEM_TENDER_T1_PACKED ||
        itemId === ITEM_TUG_T1_PACKED ||
        itemId === ITEM_PORTER_T1_PACKED ||
        itemId === ITEM_WRANGLER_T1_PACKED ||
        itemId === ITEM_DREDGER_T1_PACKED ||
        itemId === ITEM_PROSPECTOR_T2_PACKED ||
        itemId === ITEM_HAULER_SHIP_T2_PACKED
    ) {
        baseCapacity = computeBaseCapacityShip(hullStats)
    } else if (itemId === ITEM_WAREHOUSE_T1_PACKED) {
        baseCapacity = computeBaseCapacityWarehouse(hullStats)
    } else if (
        itemId === ITEM_EXTRACTOR_T1_PACKED ||
        itemId === ITEM_FACTORY_T1_PACKED ||
        itemId === ITEM_CONTAINER_T1_PACKED ||
        itemId === ITEM_CONTAINER_T2_PACKED
    ) {
        baseCapacity = computeBaseCapacityContainer(hullStats)
    }

    let out = entityDisplayName(itemId)
    out += ` - Hull ${hullMass} mass`
    if (baseCapacity > 0) {
        out += ` * ${baseCapacity} capacity`
    }
    out += '\n\n'

    for (let i = 0; i < moduleItems.length; i++) {
        out += formatModuleLine(i, moduleItems[i], moduleStats[i] ?? 0n)
        out += '\n'
    }

    return out
}
