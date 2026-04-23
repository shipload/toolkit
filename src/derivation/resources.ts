import {ResourceTier} from '../types'

export const DEPTH_THRESHOLD_T1 = 0
export const DEPTH_THRESHOLD_T2 = 2000
export const DEPTH_THRESHOLD_T3 = 10000
export const DEPTH_THRESHOLD_T4 = 30000
export const DEPTH_THRESHOLD_T5 = 55000

export const LOCATION_MIN_DEPTH = 500
export const LOCATION_MAX_DEPTH = 65535

export const YIELD_THRESHOLD = Math.floor(0.001 * 0xffffffff)

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
    {id: 101, tier: 't1'},
    {id: 102, tier: 't2'},
    {id: 103, tier: 't3'},
    {id: 201, tier: 't1'},
    {id: 202, tier: 't2'},
    {id: 203, tier: 't3'},
    {id: 301, tier: 't1'},
    {id: 302, tier: 't2'},
    {id: 303, tier: 't3'},
    {id: 401, tier: 't1'},
    {id: 402, tier: 't2'},
    {id: 403, tier: 't3'},
    {id: 501, tier: 't1'},
    {id: 502, tier: 't2'},
    {id: 503, tier: 't3'},
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
