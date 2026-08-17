export const INFLUENCE_ATOMIC_PER_POINT = 10_000
export const NEED_FP_SCALE = 10_000
export const WEIGHT_FP_SCALE = 10_000
export const MASS_KG_PER_TONNE = 1_000

export const INFLUENCE_WEIGHT_FP_MAX = 1_000_000n
export const INFLUENCE_NEED_FP_MAX = 1_000_000n
export const INFLUENCE_MASS_KG_MAX = 1n << 48n

export const DECAY_RETAIN_NUM = 19n
export const DECAY_RETAIN_DEN = 20n
export const DECAY_MAX_ITERATIONS = 1_024

export const W_EFF_ATOMIC_PER_KG = BigInt(INFLUENCE_ATOMIC_PER_POINT / MASS_KG_PER_TONNE)

export const DECOMP_MAX_BUCKETS = 12
export const DECOMP_MAX_DEPTH = 8
export const DECOMP_RAW_KG_MAX = 100_000_000
export const DECOMP_PROCESSED_KG_MAX = 100_000_000

export const RESOURCE_ORE = 0
export const RESOURCE_GAS = 1
export const RESOURCE_REGOLITH = 2
export const RESOURCE_BIOMASS = 3
export const RESOURCE_CRYSTAL = 4
export const RESOURCE_CATEGORY_COUNT = 5

export const CIVIC_LOADER_STAT = 213
export const CIVIC_LOADER_TIER = 1
export const DEFAULT_ORBITAL_Z = 800

export const GRADE_STANDARD = 0
export const GRADE_PREMIUM = 1
export const MINTREADY_DEFAULT_CAP = 10

export const BAR_SEED = 102_363
export const BAR_STEP_UNIT = 20
export const BAR_STEP_UP = BAR_STEP_UNIT * 9
export const BAR_STEP_DOWN = BAR_STEP_UNIT

export const CHARTER_NONE = 0
export const CHARTER_WORKSHOP = 1
export const CHARTER_EFFECT_SPAWN_ENTITY = 1
export const CHARTER_WORKSHOP_COST = 2_000_000_000n
export const CHARTER_BASELINE_STAT = 213
export const CHARTER_MAX_PREREQS = 4

export const INFLUENCE_D1_SEED = 45_369
export const DEMAND_TRIPLE_SEED = {peak: 20_000n, base: 10_000n, floor: 1_000n}

export function poolKey(category: number, tier: number, grade: number): bigint {
    return (BigInt(category) << 16n) | (BigInt(tier) << 8n) | BigInt(grade)
}

export function influenceWeightKey(category: number, tier: number): bigint {
    return (BigInt(category) << 8n) | BigInt(tier)
}

export function atomicToPoints(atomic: bigint | number | string): number {
    return Math.floor(Number(BigInt(atomic.toString())) / INFLUENCE_ATOMIC_PER_POINT)
}
