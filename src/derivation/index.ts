export {deriveStratum, deriveResourceStats} from './stratum'
export type {StratumInfo, ResourceStats} from './stratum'
export {deriveLocationSize} from './location-size'
export {
    getEligibleResources,
    getResourceWeight,
    getLocationCandidates,
    getDepthThreshold,
    getResourceRarity,
    depthScaleFactor,
    DEPTH_THRESHOLD_COMMON,
    DEPTH_THRESHOLD_UNCOMMON,
    DEPTH_THRESHOLD_RARE,
    DEPTH_THRESHOLD_EPIC,
    DEPTH_THRESHOLD_LEGENDARY,
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
