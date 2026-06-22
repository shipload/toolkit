import {describe, expect, test} from 'bun:test'
import * as sdk from '../index-module'

describe('coordinate constants re-export', () => {
    test('frozen spatial constants are reachable from the package root', () => {
        expect(sdk.REGION_DIV).toBe(10_000)
        expect(sdk.SECTOR_DIV).toBe(100_000_000)
        expect(sdk.COORD_OFFSET).toBe(2_147_485_000)
        expect(sdk.SECTORS_PER_AXIS).toBe(43)
        expect(sdk.REGION_PER_AXIS).toBe(10_000)
        expect(sdk.LOCAL_HALF).toBe(5_000)
        expect(sdk.COORD_MIN).toBe(-2_147_483_648)
        expect(sdk.COORD_MAX).toBe(2_147_483_647)
    })
})
