export {deriveStratum, deriveResourceStats} from './stratum'
export type {StratumInfo, ResourceStats} from './stratum'
export {deriveStrata} from './strata'
export type {DerivedStratum} from './strata'
export {deriveLocationSize} from './location-size'
export {
    getEligibleResources,
    getResourceWeight,
    getLocationCandidates,
    getLocationProfile,
    getDepthThreshold,
    getResourceTier,
    DEPTH_THRESHOLD_T1,
    DEPTH_THRESHOLD_T2,
    DEPTH_THRESHOLD_T3,
    DEPTH_THRESHOLD_T4,
    DEPTH_THRESHOLD_T5,
    LOCATION_MIN_DEPTH,
    LOCATION_MAX_DEPTH,
    yieldThresholdAt,
    YIELD_FRACTION_SHALLOW,
    YIELD_FRACTION_DEEP,
    PLANET_SUBTYPE_GAS_GIANT,
    PLANET_SUBTYPE_ROCKY,
    PLANET_SUBTYPE_TERRESTRIAL,
    PLANET_SUBTYPE_ICY,
    PLANET_SUBTYPE_OCEAN,
    PLANET_SUBTYPE_INDUSTRIAL,
} from './resources'

export {
    RESERVE_TIERS,
    TIER_ROLL_MAX,
    tierOfReserve,
    rollTier,
    rollWithinTier,
    RESOURCE_TIER_MULT_TENTHS,
    applyResourceTierMultiplier,
} from './tiers'
export type {ReserveTier, TierRange} from './tiers'

export {getEffectiveReserve} from './reserve-regen'
export type {EffectiveReserveInput} from './reserve-regen'

export * from './stats'
export * from './crafting'

export {
    STAR_STEP,
    MAX_STARS_PER_STAT,
    MAX_STAR_RATING,
    starsForStat,
    starRating,
    statMagnitude,
    compareByStars,
} from './stars'
export type {StarSortable} from './stars'
