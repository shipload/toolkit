import {getItem} from '../data/catalog'
import {LocationType} from '../types'

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
    DEPTH_THRESHOLD_T1,
    DEPTH_THRESHOLD_T2,
    DEPTH_THRESHOLD_T3,
    DEPTH_THRESHOLD_T4,
    DEPTH_THRESHOLD_T5,
    DEPTH_THRESHOLD_T6,
    DEPTH_THRESHOLD_T7,
    DEPTH_THRESHOLD_T8,
    DEPTH_THRESHOLD_T9,
    DEPTH_THRESHOLD_T10,
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

const RESOURCE_ORE = 0
const RESOURCE_GAS = 1
const RESOURCE_REGOLITH = 2
const RESOURCE_BIOMASS = 3
const RESOURCE_CRYSTAL = 4

interface LocationProfileEntry {
    category: number
    maxTier: number
}

function categoryBaseId(category: number): number {
    switch (category) {
        case RESOURCE_ORE:
            return 100
        case RESOURCE_CRYSTAL:
            return 200
        case RESOURCE_GAS:
            return 300
        case RESOURCE_REGOLITH:
            return 400
        case RESOURCE_BIOMASS:
            return 500
        default:
            return 0
    }
}

function resourceId(category: number, tier: number): number {
    return categoryBaseId(category) + tier
}

export function getLocationProfile(locationType: number, subtype: number): LocationProfileEntry[] {
    if (locationType === LocationType.ASTEROID) {
        return [
            {category: RESOURCE_ORE, maxTier: 5},
            {category: RESOURCE_CRYSTAL, maxTier: 5},
        ]
    }
    if (locationType === LocationType.NEBULA) {
        return [
            {category: RESOURCE_GAS, maxTier: 5},
            {category: RESOURCE_REGOLITH, maxTier: 5},
        ]
    }
    if (locationType === LocationType.ICE_FIELD) {
        return [
            {category: RESOURCE_GAS, maxTier: 5},
            {category: RESOURCE_BIOMASS, maxTier: 5},
        ]
    }
    if (locationType === LocationType.PLANET) {
        switch (subtype) {
            case PLANET_SUBTYPE_GAS_GIANT:
                return [
                    {category: RESOURCE_GAS, maxTier: 10},
                    {category: RESOURCE_CRYSTAL, maxTier: 3},
                ]
            case PLANET_SUBTYPE_ROCKY:
                return [
                    {category: RESOURCE_REGOLITH, maxTier: 10},
                    {category: RESOURCE_ORE, maxTier: 3},
                ]
            case PLANET_SUBTYPE_TERRESTRIAL:
                return [
                    {category: RESOURCE_ORE, maxTier: 10},
                    {category: RESOURCE_BIOMASS, maxTier: 3},
                ]
            case PLANET_SUBTYPE_ICY:
                return [
                    {category: RESOURCE_CRYSTAL, maxTier: 10},
                    {category: RESOURCE_REGOLITH, maxTier: 3},
                ]
            case PLANET_SUBTYPE_OCEAN:
                return [
                    {category: RESOURCE_BIOMASS, maxTier: 10},
                    {category: RESOURCE_GAS, maxTier: 3},
                ]
            case PLANET_SUBTYPE_INDUSTRIAL:
                return [
                    {category: RESOURCE_ORE, maxTier: 3},
                    {category: RESOURCE_CRYSTAL, maxTier: 3},
                    {category: RESOURCE_REGOLITH, maxTier: 3},
                    {category: RESOURCE_BIOMASS, maxTier: 3},
                ]
        }
    }
    return []
}

export function getLocationCandidates(locationType: number, subtype: number): number[] {
    const profile = getLocationProfile(locationType, subtype)
    const ids: number[] = []
    for (const {category, maxTier} of profile) {
        for (let tier = 1; tier <= maxTier; tier++) {
            ids.push(resourceId(category, tier))
        }
    }
    return ids
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
