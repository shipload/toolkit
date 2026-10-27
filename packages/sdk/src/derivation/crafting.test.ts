import {describe, expect, test} from 'bun:test'
import {usedInputStatKeys} from './crafting'
import {ITEM_BUILDER_T1} from '../data/item-ids'

describe('usedInputStatKeys', () => {
    test('maps each input to the stat keys the blend actually consumes', () => {
        expect(usedInputStatKeys(ITEM_BUILDER_T1)).toEqual([
            ['hardness', 'fineness'],
            ['saturation'],
        ])
    })

    test('returns an empty array for an unknown recipe', () => {
        expect(usedInputStatKeys(999999)).toEqual([])
    })
})
