import type {FeistelConfig} from './permutation'

// FROZEN INTERFACE — these values define the on-the-wire address format.
export const COORD_MIN = -2_147_483_648
export const COORD_MAX = 2_147_483_647
// Smallest multiple of REGION_DIV (10,000) >= 2^31: keeps u >= 0 AND puts global (0,0) at local (0,0).
export const COORD_OFFSET = 2_147_490_000
export const AXIS_SPAN = 4_294_967_296 // 2^32 distinct values per axis

export const SECTOR_DIV = 100_000_000 // 10^8 tiles per sector side
export const REGION_DIV = 10_000 // 10^4 tiles per region side
export const SECTORS_PER_AXIS = 43 // floor((2^32 - 1) / 10^8) + 1
export const REGION_PER_AXIS = 10_000
export const LOCAL_MAX = 9_999

export const SECTOR_COUNT = SECTORS_PER_AXIS * SECTORS_PER_AXIS // 1849
export const REGION_COUNT = REGION_PER_AXIS * REGION_PER_AXIS // 100,000,000

// 2*halfBits must give a block domain >= the tier's count.
export const SECTOR_FEISTEL: FeistelConfig = {n: SECTOR_COUNT, halfBits: 6, label: 'sector'} // 2^12 = 4096
export const REGION_FEISTEL: FeistelConfig = {n: REGION_COUNT, halfBits: 14, label: 'region'} // 2^28 ≈ 2.68e8
