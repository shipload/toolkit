import {ResourceRarity} from '../types'

export const DEPTH_THRESHOLD_COMMON = 0
export const DEPTH_THRESHOLD_UNCOMMON = 2000
export const DEPTH_THRESHOLD_RARE = 10000
export const DEPTH_THRESHOLD_EPIC = 30000
export const DEPTH_THRESHOLD_LEGENDARY = 55000

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
    rarity: ResourceRarity
}

const RESOURCE_CATALOG: ResourceEntry[] = [
    {id: 26, rarity: 'common'},
    {id: 1, rarity: 'common'},
    {id: 14, rarity: 'common'},
    {id: 6, rarity: 'common'},
    {id: 29, rarity: 'uncommon'},
    {id: 2, rarity: 'uncommon'},
    {id: 1000, rarity: 'uncommon'},
    {id: 1003, rarity: 'uncommon'},
    {id: 22, rarity: 'rare'},
    {id: 18, rarity: 'rare'},
    {id: 1001, rarity: 'rare'},
    {id: 1002, rarity: 'rare'},
    {id: 74, rarity: 'epic'},
    {id: 54, rarity: 'epic'},
]

export function getDepthThreshold(rarity: ResourceRarity): number {
    switch (rarity) {
        case 'common':
            return DEPTH_THRESHOLD_COMMON
        case 'uncommon':
            return DEPTH_THRESHOLD_UNCOMMON
        case 'rare':
            return DEPTH_THRESHOLD_RARE
        case 'epic':
            return DEPTH_THRESHOLD_EPIC
        case 'legendary':
            return DEPTH_THRESHOLD_LEGENDARY
    }
}

export function getResourceRarity(itemId: number): ResourceRarity {
    const entry = RESOURCE_CATALOG.find((r) => r.id === itemId)
    return entry ? entry.rarity : 'legendary'
}

export function getResourceWeight(itemId: number, stratum: number): number {
    const rarity = getResourceRarity(itemId)
    const threshold = getDepthThreshold(rarity)
    if (stratum < threshold) return 0

    const depthAbove = stratum - threshold

    switch (rarity) {
        case 'common':
            if (stratum < 2000) return 100
            if (stratum < 10000) return 80
            if (stratum < 30000) return 50
            return 30
        case 'uncommon':
            if (depthAbove < 3000) return 40
            if (depthAbove < 8000) return 60
            return 50
        case 'rare':
            if (depthAbove < 5000) return 20
            if (depthAbove < 15000) return 35
            return 40
        case 'epic':
            if (depthAbove < 10000) return 10
            if (depthAbove < 25000) return 20
            return 30
        case 'legendary':
            return 10
    }
}

const ASTEROID_RESOURCES = [26, 29, 22, 74, 14, 1000, 1001]
const NEBULA_RESOURCES = [1, 2, 18, 54]
const GAS_GIANT_RESOURCES = [1, 2, 18, 54]
const ROCKY_RESOURCES = [26, 29, 22, 74, 6, 1003, 1002]
const TERRESTRIAL_RESOURCES = [6, 1003, 1002, 1001]
const ICY_RESOURCES = [6, 14, 1000, 1001, 18]
const OCEAN_RESOURCES = [1, 2, 1003, 1002]
const INDUSTRIAL_RESOURCES = [26, 29, 22, 74, 14, 1000, 54]

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
        const rarity = getResourceRarity(itemId)
        const threshold = getDepthThreshold(rarity)
        return stratum >= threshold
    })
}

export function depthScaleFactor(stratum: number): number {
    if (stratum <= 1) return 1.0
    const logScale = Math.log(stratum) / Math.log(65535)
    return 1.0 + logScale * 2.0
}
