export {deriveStratum, deriveResourceStats} from './stratum'
export type {StratumInfo, ResourceStats} from './stratum'
export {deriveLocationSize} from './location-size'
export {
    getEligibleResources,
    getResourceWeight,
    getLocationCandidates,
    getDepthThreshold,
    getResourceTier,
    depthScaleFactor,
    DEPTH_THRESHOLD_T1,
    DEPTH_THRESHOLD_T2,
    DEPTH_THRESHOLD_T3,
    DEPTH_THRESHOLD_T4,
    DEPTH_THRESHOLD_T5,
    LOCATION_MIN_DEPTH,
    LOCATION_MAX_DEPTH,
    YIELD_THRESHOLD,
    PLANET_SUBTYPE_GAS_GIANT,
    PLANET_SUBTYPE_ROCKY,
    PLANET_SUBTYPE_TERRESTRIAL,
    PLANET_SUBTYPE_ICY,
    PLANET_SUBTYPE_OCEAN,
    PLANET_SUBTYPE_INDUSTRIAL,
} from './resources'

export * from './stats'
