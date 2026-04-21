import {
    getModuleCapabilityType,
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_LOADER_T1,
    ITEM_MANUFACTURING_T1,
    ITEM_STORAGE_T1,
    MODULE_CRAFTER,
    MODULE_ENGINE,
    MODULE_GATHERER,
    MODULE_GENERATOR,
    MODULE_LOADER,
    MODULE_STORAGE,
} from '../capabilities/modules'
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '../data/recipes'
import {decodeStat} from '../derivation/crafting'

function idiv(a: number, b: number): number {
    return Math.floor(a / b)
}

export function computeBaseHullmass(stats: bigint): number {
    const density = decodeStat(stats, 1)
    return 25000 + 75 * density
}

export function computeBaseCapacityShip(stats: bigint): number {
    const s = decodeStat(stats, 0) + decodeStat(stats, 2) + decodeStat(stats, 3)
    return Math.floor(1_000_000 * Math.pow(10, s / 2997))
}

export function computeBaseCapacityWarehouse(stats: bigint): number {
    const s = decodeStat(stats, 0) + decodeStat(stats, 2) + decodeStat(stats, 3)
    return Math.floor(20_000_000 * Math.pow(10, s / 2997))
}

export const computeEngineThrust = (vol: number): number => 400 + idiv(vol * 3, 4)
export const computeEngineDrain = (thm: number): number => Math.max(30, 50 - idiv(thm, 70))
export const computeGeneratorCap = (res: number): number => 300 + idiv(res, 6)
export const computeGeneratorRech = (clr: number): number => 1 + idiv(clr * 3, 1000)
export const computeGathererYield = (str: number): number => 200 + str
export const computeGathererDrain = (con: number): number =>
    Math.max(250, 1250 - idiv(con * 25, 20))
export const computeGathererDepth = (tol: number): number => 200 + idiv(tol * 3, 2)
export const computeGathererSpeed = (ref: number): number => 100 + idiv(ref * 4, 5)
export const computeLoaderMass = (duc: number): number => Math.max(200, 2000 - duc * 2)
export const computeLoaderThrust = (pla: number): number => 1 + idiv(pla, 500)
export const computeCrafterSpeed = (rea: number): number => 100 + idiv(rea * 4, 5)
export const computeCrafterDrain = (clr: number): number => Math.max(5, 30 - idiv(clr, 33))

export function entityDisplayName(itemId: number): string {
    switch (itemId) {
        case ITEM_SHIP_T1_PACKED:
            return 'Ship T1'
        case ITEM_WAREHOUSE_T1_PACKED:
            return 'Warehouse T1'
        case ITEM_CONTAINER_T1_PACKED:
            return 'Container T1'
        case ITEM_CONTAINER_T2_PACKED:
            return 'Container T2'
        default:
            return 'Entity'
    }
}

export function moduleDisplayName(itemId: number): string {
    switch (itemId) {
        case ITEM_ENGINE_T1:
            return 'Engine T1'
        case ITEM_GENERATOR_T1:
            return 'Generator T1'
        case ITEM_GATHERER_T1:
            return 'Gatherer T1'
        case ITEM_LOADER_T1:
            return 'Loader T1'
        case ITEM_MANUFACTURING_T1:
            return 'Manufacturing T1'
        case ITEM_STORAGE_T1:
            return 'Storage T1'
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
            const clr = decodeStat(stats, 1)
            out += `  Capacity ${computeGeneratorCap(res)}  Recharge ${computeGeneratorRech(clr)}`
            break
        }
        case MODULE_GATHERER: {
            const str = decodeStat(stats, 0)
            const tol = decodeStat(stats, 1)
            const con = decodeStat(stats, 3)
            const ref = decodeStat(stats, 4)
            out += `  Yield ${computeGathererYield(str)}  Depth ${computeGathererDepth(
                tol
            )}  Speed ${computeGathererSpeed(ref)}  Drain ${computeGathererDrain(con)}`
            break
        }
        case MODULE_LOADER: {
            const duc = decodeStat(stats, 0)
            const pla = decodeStat(stats, 1)
            out += `  Mass ${computeLoaderMass(duc)}  Thrust ${computeLoaderThrust(pla)}`
            break
        }
        case MODULE_CRAFTER: {
            const rea = decodeStat(stats, 0)
            const clr = decodeStat(stats, 1)
            out += `  Speed ${computeCrafterSpeed(rea)}  Drain ${computeCrafterDrain(clr)}`
            break
        }
        case MODULE_STORAGE: {
            const str = decodeStat(stats, 0)
            const duc = decodeStat(stats, 1)
            const pur = decodeStat(stats, 2)
            const sum = str + duc + pur
            const pct = 10 + idiv(sum * 10, 2997)
            out += `  +${pct}% capacity`
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
