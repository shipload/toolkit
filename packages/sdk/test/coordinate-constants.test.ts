import {Bytes, Checksum256} from '@wharfkit/antelope'
import {expect, test} from 'bun:test'
import {permute, unpermute} from '../src/coordinates/permutation'
import {
    AXIS_SPAN,
    COORD_MAX,
    COORD_MIN,
    COORD_OFFSET,
    LOCAL_HALF,
    LOCAL_MIN,
    LOCAL_MAX,
    REGION_COUNT,
    REGION_DIV,
    REGION_FEISTEL,
    REGION_PER_AXIS,
    SECTOR_COUNT,
    SECTOR_DIV,
    SECTOR_FEISTEL,
    SECTORS_PER_AXIS,
} from '../src/coordinates/constants'

const SEED = Checksum256.hash(Bytes.from('test-game-seed', 'utf8'))

test('constants cover the full int32 axis range', () => {
    expect(COORD_MIN).toBe(-2_147_483_648)
    expect(COORD_MAX).toBe(2_147_483_647)
    expect(COORD_OFFSET).toBe(2_147_485_000)
    expect(AXIS_SPAN).toBe(4_294_967_296)
    expect(COORD_MIN + COORD_OFFSET).toBeGreaterThanOrEqual(0)
    const maxU =
        (SECTORS_PER_AXIS - 1) * SECTOR_DIV + (REGION_PER_AXIS - 1) * REGION_DIV + LOCAL_MAX
    expect(maxU).toBeGreaterThanOrEqual(COORD_MAX + COORD_OFFSET)
})

test('offset aligns the origin to local (0,0)', () => {
    expect(COORD_OFFSET % REGION_DIV).toBe(LOCAL_HALF)
})

test('tier slicing constants compose', () => {
    expect(SECTOR_DIV).toBe(REGION_DIV * REGION_PER_AXIS)
    expect(REGION_DIV).toBe(LOCAL_MAX - LOCAL_MIN + 1)
    expect(SECTORS_PER_AXIS).toBe(43)
    expect(SECTOR_COUNT).toBe(SECTORS_PER_AXIS * SECTORS_PER_AXIS)
    expect(REGION_COUNT).toBe(REGION_PER_AXIS * REGION_PER_AXIS)
})

test('feistel configs span their tier domains', () => {
    expect(SECTOR_FEISTEL.n).toBe(SECTOR_COUNT)
    expect(REGION_FEISTEL.n).toBe(REGION_COUNT)
    expect(1 << (2 * SECTOR_FEISTEL.halfBits)).toBeGreaterThanOrEqual(SECTOR_COUNT)
    expect(2 ** (2 * REGION_FEISTEL.halfBits)).toBeGreaterThanOrEqual(REGION_COUNT)
    expect(unpermute(SEED, permute(SEED, SECTOR_COUNT - 1, SECTOR_FEISTEL), SECTOR_FEISTEL)).toBe(
        SECTOR_COUNT - 1
    )
    expect(unpermute(SEED, permute(SEED, REGION_COUNT - 1, REGION_FEISTEL), REGION_FEISTEL)).toBe(
        REGION_COUNT - 1
    )
})
