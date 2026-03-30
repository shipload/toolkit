import {ResourceTier} from '../types'

export const DEPTH_THRESHOLD_T1 = 0
export const DEPTH_THRESHOLD_T2 = 2000
export const DEPTH_THRESHOLD_T3 = 10000
export const DEPTH_THRESHOLD_T4 = 30000
export const DEPTH_THRESHOLD_T5 = 55000

export const LOCATION_MIN_DEPTH = 500
export const LOCATION_MAX_DEPTH = 65535

export const YIELD_THRESHOLD = Math.floor(0.003 * 0xffffffff)

export const PLANET_SUBTYPE_GAS_GIANT = 0
export const PLANET_SUBTYPE_ROCKY = 1
export const PLANET_SUBTYPE_TERRESTRIAL = 2
export const PLANET_SUBTYPE_ICY = 3
export const PLANET_SUBTYPE_OCEAN = 4
export const PLANET_SUBTYPE_INDUSTRIAL = 5

interface ResourceEntry {
    id: number
    tier: ResourceTier
}

const RESOURCE_CATALOG: ResourceEntry[] = [
    {id: 26, tier: 't1'},
    {id: 13, tier: 't2'},
    {id: 24, tier: 't3'},
    {id: 29, tier: 't1'},
    {id: 47, tier: 't2'},
    {id: 79, tier: 't3'},
    {id: 1, tier: 't1'},
    {id: 2, tier: 't2'},
    {id: 18, tier: 't3'},
    {id: 14, tier: 't1'},
    {id: 1000, tier: 't2'},
    {id: 1001, tier: 't3'},
    {id: 6, tier: 't1'},
    {id: 1003, tier: 't2'},
    {id: 1002, tier: 't3'},
]

export function getDepthThreshold(tier: ResourceTier): number {
    switch (tier) {
        case 't1':
            return DEPTH_THRESHOLD_T1
        case 't2':
            return DEPTH_THRESHOLD_T2
        case 't3':
            return DEPTH_THRESHOLD_T3
        case 't4':
            return DEPTH_THRESHOLD_T4
        case 't5':
            return DEPTH_THRESHOLD_T5
    }
}

export function getResourceTier(itemId: number): ResourceTier {
    const entry = RESOURCE_CATALOG.find((r) => r.id === itemId)
    return entry ? entry.tier : 't5'
}

export function getResourceWeight(itemId: number, stratum: number): number {
    const tier = getResourceTier(itemId)
    const threshold = getDepthThreshold(tier)
    if (stratum < threshold) return 0

    const depthAbove = stratum - threshold

    switch (tier) {
        case 't1':
            if (stratum < 2000) return 100
            if (stratum < 10000) return 80
            if (stratum < 30000) return 50
            return 30
        case 't2':
            if (depthAbove < 3000) return 40
            if (depthAbove < 8000) return 60
            return 50
        case 't3':
            if (depthAbove < 5000) return 20
            if (depthAbove < 15000) return 35
            return 40
        case 't4':
            if (depthAbove < 10000) return 10
            if (depthAbove < 25000) return 20
            return 30
        case 't5':
            return 10
    }
}

const ASTEROID_RESOURCES = [26, 13, 24, 29, 47]
const NEBULA_RESOURCES = [47, 79, 1, 2, 18]
const GAS_GIANT_RESOURCES = [1, 2, 18, 14, 6]
const ROCKY_RESOURCES = [26, 13, 24, 14, 1000, 1001, 1002]
const TERRESTRIAL_RESOURCES = [29, 47, 14, 1000, 6, 1003, 1002]
const ICY_RESOURCES = [26, 1, 2, 14, 1001, 6, 1003]
const OCEAN_RESOURCES = [29, 79, 1, 18, 6, 1003, 1002]
const INDUSTRIAL_RESOURCES = [26, 13, 24, 29, 79, 1000, 1001]

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

export function depthScaleFactor(stratum: number): number {
    if (stratum <= 1) return 1.0
    const logScale = Math.log(stratum) / Math.log(65535)
    return 1.0 + logScale * 2.0
}
