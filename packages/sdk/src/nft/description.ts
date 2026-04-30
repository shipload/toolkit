import {
    getModuleCapabilityType,
    MODULE_CRAFTER,
    MODULE_ENGINE,
    MODULE_GATHERER,
    MODULE_GENERATOR,
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
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_HAULER_T1,
    ITEM_LOADER_T1,
    ITEM_SHIP_T1_PACKED,
    ITEM_STORAGE_T1,
    ITEM_WAREHOUSE_T1_PACKED,
    ITEM_WARP_T1,
} from '../data/item-ids'
import {decodeStat} from '../derivation/crafting'
import {gathererDepthForTier} from '../entities/ship-deploy'
import {getItem} from '../data/catalog'

function idiv(a: number, b: number): number {
    return Math.floor(a / b)
}

export function computeBaseHullmass(stats: bigint): number {
    const density = decodeStat(stats, 1)
    return 25000 + 75 * density
}

export function computeBaseCapacityShip(stats: bigint): number {
    const s = decodeStat(stats, 0) + decodeStat(stats, 2) + decodeStat(stats, 3)
    return Math.floor(1_000_000 * 10 ** (s / 2997))
}

export function computeBaseCapacityWarehouse(stats: bigint): number {
    const s = decodeStat(stats, 0) + decodeStat(stats, 2) + decodeStat(stats, 3)
    return Math.floor(20_000_000 * 10 ** (s / 2997))
}

export const computeEngineThrust = (vol: number): number => 400 + idiv(vol * 3, 4)
export const computeEngineDrain = (thm: number): number => Math.max(30, 50 - idiv(thm, 70))
export const computeGeneratorCap = (com: number): number => 300 + idiv(com, 6)
export const computeGeneratorRech = (fin: number): number => 1 + idiv(fin * 3, 1000)
export const computeGathererYield = (str: number): number => 200 + str
export const computeGathererDrain = (con: number): number =>
    Math.max(250, 1250 - idiv(con * 25, 20))
export const computeGathererDepth = (tol: number, tier: number): number =>
    gathererDepthForTier(tol, tier)
export const computeGathererSpeed = (ref: number): number => 100 + idiv(ref * 4, 5)
export const computeLoaderMass = (ins: number): number => Math.max(200, 2000 - ins * 2)
export const computeLoaderThrust = (pla: number): number => 1 + idiv(pla, 500)
export const computeCrafterSpeed = (rea: number): number => 100 + idiv(rea * 4, 5)
export const computeCrafterDrain = (fin: number): number => Math.max(5, 30 - idiv(fin, 33))
export const computeHaulerCapacity = (fin: number): number => Math.max(1, 1 + idiv(fin, 400))
export const computeHaulerEfficiency = (con: number): number => 2000 + con * 6
export const computeHaulerDrain = (com: number): number => Math.max(3, 15 - idiv(com, 80))
export const computeWarpRange = (stat: number): number => 100 + stat * 3

export function entityDisplayName(itemId: number): string {
    switch (itemId) {
        case ITEM_SHIP_T1_PACKED:
            return 'Ship'
        case ITEM_WAREHOUSE_T1_PACKED:
            return 'Warehouse'
        case ITEM_CONTAINER_T1_PACKED:
            return 'Container'
        case ITEM_CONTAINER_T2_PACKED:
            return 'Container'
        default:
            return 'Entity'
    }
}

export function moduleDisplayName(itemId: number): string {
    switch (itemId) {
        case ITEM_ENGINE_T1:
            return 'Engine'
        case ITEM_GENERATOR_T1:
            return 'Generator'
        case ITEM_GATHERER_T1:
            return 'Gatherer'
        case ITEM_LOADER_T1:
            return 'Loader'
        case ITEM_CRAFTER_T1:
            return 'Crafter'
        case ITEM_STORAGE_T1:
            return 'Storage'
        case ITEM_HAULER_T1:
            return 'Hauler'
        case ITEM_WARP_T1:
            return 'Warp'
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
            const vol = decodeStat(stats, 0)
            const thm = decodeStat(stats, 1)
            out += `  Thrust ${computeEngineThrust(vol)}  Drain ${computeEngineDrain(thm)}`
            break
        }
        case MODULE_GENERATOR: {
            const res = decodeStat(stats, 0)
            const ref = decodeStat(stats, 1)
            out += `  Capacity ${computeGeneratorCap(res)}  Recharge ${computeGeneratorRech(ref)}`
            break
        }
        case MODULE_GATHERER: {
            const str = decodeStat(stats, 0)
            const tol = decodeStat(stats, 1)
            const con = decodeStat(stats, 3)
            const ref = decodeStat(stats, 4)
            const tier = getItem(itemId).tier
            out += `  Yield ${computeGathererYield(str)}  Depth ${computeGathererDepth(
                tol,
                tier
            )}  Speed ${computeGathererSpeed(ref)}  Drain ${computeGathererDrain(con)}`
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
            const com = decodeStat(stats, 1)
            out += `  Speed ${computeCrafterSpeed(rea)}  Drain ${computeCrafterDrain(com)}`
            break
        }
        case MODULE_STORAGE: {
            const str = decodeStat(stats, 0)
            const fin = decodeStat(stats, 2)
            const sat = decodeStat(stats, 3)
            const sum = str + fin + sat
            const pct = 10 + idiv(sum * 10, 2997)
            out += `  +${pct}% capacity`
            break
        }
        case MODULE_HAULER: {
            const fin = decodeStat(stats, 0)
            const con = decodeStat(stats, 1)
            const com = decodeStat(stats, 2)
            out += `  Capacity ${computeHaulerCapacity(fin)}  Efficiency ${computeHaulerEfficiency(con)}  Drain ${computeHaulerDrain(com)}`
            break
        }
        case MODULE_WARP: {
            const stat = decodeStat(stats, 0)
            out += `  Range ${computeWarpRange(stat)}`
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
    const hullMass = computeBaseHullmass(hullStats)
    let baseCapacity = 0
    if (itemId === ITEM_SHIP_T1_PACKED) {
        baseCapacity = computeBaseCapacityShip(hullStats)
    } else if (itemId === ITEM_WAREHOUSE_T1_PACKED) {
        baseCapacity = computeBaseCapacityWarehouse(hullStats)
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
