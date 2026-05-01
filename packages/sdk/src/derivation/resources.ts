import {getItem} from '../data/catalog'

export const DEPTH_THRESHOLD_T1 = 0
export const DEPTH_THRESHOLD_T2 = 1500
export const DEPTH_THRESHOLD_T3 = 5000
export const DEPTH_THRESHOLD_T4 = 12000
export const DEPTH_THRESHOLD_T5 = 22000
export const DEPTH_THRESHOLD_T6 = 32000
export const DEPTH_THRESHOLD_T7 = 42000
export const DEPTH_THRESHOLD_T8 = 50000
export const DEPTH_THRESHOLD_T9 = 57000
export const DEPTH_THRESHOLD_T10 = 63000

export const LOCATION_MIN_DEPTH = 500
export const LOCATION_MAX_DEPTH = 65535

export const YIELD_THRESHOLD = Math.floor(0.001 * 0xffffffff)

export const PLANET_SUBTYPE_GAS_GIANT = 0
export const PLANET_SUBTYPE_ROCKY = 1
export const PLANET_SUBTYPE_TERRESTRIAL = 2
export const PLANET_SUBTYPE_ICY = 3
export const PLANET_SUBTYPE_OCEAN = 4
export const PLANET_SUBTYPE_INDUSTRIAL = 5

const DEPTH_THRESHOLD_TABLE = [
    DEPTH_THRESHOLD_T1, DEPTH_THRESHOLD_T2, DEPTH_THRESHOLD_T3, DEPTH_THRESHOLD_T4,
    DEPTH_THRESHOLD_T5, DEPTH_THRESHOLD_T6, DEPTH_THRESHOLD_T7, DEPTH_THRESHOLD_T8,
    DEPTH_THRESHOLD_T9, DEPTH_THRESHOLD_T10,
]

export function getDepthThreshold(tier: number): number {
    if (tier < 1 || tier > 10) return 65535
    return DEPTH_THRESHOLD_TABLE[tier - 1]
}

export function getResourceTier(itemId: number): number {
    return getItem(itemId).tier
}

export function getResourceWeight(itemId: number, stratum: number): number {
    const tier = getResourceTier(itemId)
    const threshold = getDepthThreshold(tier)
    if (stratum < threshold) return 0

    const depthAbove = stratum - threshold

    switch (tier) {
        case 1:
            if (stratum < DEPTH_THRESHOLD_T2) return 100
            if (stratum < DEPTH_THRESHOLD_T3) return 80
            if (stratum < DEPTH_THRESHOLD_T4) return 50
            return 30
        case 2:
            if (depthAbove < 3000) return 40
            if (depthAbove < 8000) return 60
            return 50
        case 3:
            if (depthAbove < 5000) return 20
            if (depthAbove < 15000) return 35
            return 40
        case 4:
            if (depthAbove < 10000) return 10
            if (depthAbove < 25000) return 20
            return 30
        default:
            return 10
    }
}

const ASTEROID_RESOURCES = [101, 102, 103, 201, 202]
const NEBULA_RESOURCES = [202, 203, 301, 302, 303]
const GAS_GIANT_RESOURCES = [301, 302, 303, 401, 501]
const ROCKY_RESOURCES = [101, 102, 103, 401, 402, 403, 503]
const TERRESTRIAL_RESOURCES = [201, 202, 401, 402, 501, 502, 503]
const ICY_RESOURCES = [101, 301, 302, 401, 403, 501, 502]
const OCEAN_RESOURCES = [201, 203, 301, 303, 501, 502, 503]
const INDUSTRIAL_RESOURCES = [101, 102, 103, 201, 203, 402, 403]

export function getLocationCandidates(locationType: number, subtype: number): number[] {
    if (locationType === 2) return ASTEROID_RESOURCES
    if (locationType === 3) return NEBULA_RESOURCES
    if (locationType === 1) {
        switch (subtype) {
            case PLANET_SUBTYPE_GAS_GIANT:
                return GAS_GIANT_RESOURCES
            case PLANET_SUBTYPE_ROCKY:
                return ROCKY_RESOURCES
            case PLANET_SUBTYPE_TERRESTRIAL:
                return TERRESTRIAL_RESOURCES
            case PLANET_SUBTYPE_ICY:
                return ICY_RESOURCES
            case PLANET_SUBTYPE_OCEAN:
                return OCEAN_RESOURCES
            case PLANET_SUBTYPE_INDUSTRIAL:
                return INDUSTRIAL_RESOURCES
        }
    }
    return []
}

export function getEligibleResources(
    locationType: number,
    subtype: number,
    stratum: number
): number[] {
    const candidates = getLocationCandidates(locationType, subtype)
    return candidates.filter((itemId) => {
        const tier = getResourceTier(itemId)
        const threshold = getDepthThreshold(tier)
        return stratum >= threshold
    })
}
