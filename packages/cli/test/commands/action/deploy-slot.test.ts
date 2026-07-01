import {describe, expect, test} from 'bun:test'
import {ITEM_HUB_T1_PACKED, ITEM_SHIP_T1_PACKED, ITEM_WAREHOUSE_T1_PACKED} from '@shipload/sdk'
import {parseCellOption, resolveDeploySlot} from '../../../src/commands/action/deploy-slot'

describe('parseCellOption', () => {
    test('parses <hub>:<gx>:<gy> with signed coords', () => {
        expect(parseCellOption('5:-1:0')).toEqual({hub: 5n, gx: -1, gy: 0})
    })
    test('rejects malformed input', () => {
        expect(() => parseCellOption('5:-1')).toThrow()
        expect(() => parseCellOption('5:x:0')).toThrow()
    })
})

describe('resolveDeploySlot', () => {
    test('structure with a cell returns the slot', () => {
        expect(resolveDeploySlot(ITEM_WAREHOUSE_T1_PACKED, {hub: 5n, gx: -1, gy: 0})).toEqual({
            hub: 5n,
            gx: -1,
            gy: 0,
        })
    })
    test('structure without a cell throws', () => {
        expect(() => resolveDeploySlot(ITEM_WAREHOUSE_T1_PACKED, undefined)).toThrow(
            /requires a hub cell/
        )
    })
    test('hub with a cell throws', () => {
        expect(() => resolveDeploySlot(ITEM_HUB_T1_PACKED, {hub: 5n, gx: 0, gy: 0})).toThrow(
            /does not take a hub cell/
        )
    })
    test('hub without a cell returns undefined', () => {
        expect(resolveDeploySlot(ITEM_HUB_T1_PACKED, undefined)).toBeUndefined()
    })
    test('vessel without a cell returns undefined; vessel with a cell throws', () => {
        expect(resolveDeploySlot(ITEM_SHIP_T1_PACKED, undefined)).toBeUndefined()
        expect(() => resolveDeploySlot(ITEM_SHIP_T1_PACKED, {hub: 5n, gx: 0, gy: 0})).toThrow(
            /does not take a hub cell/
        )
    })
})
