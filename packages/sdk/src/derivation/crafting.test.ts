import {describe, expect, test} from 'bun:test'
import {usedInputStatKeys} from './crafting'
import {ITEM_BUILDER_T1} from '../data/item-ids'

describe('usedInputStatKeys', () => {
    test('maps each input to the stat keys the blend actually consumes', () => {
        // Ceramic.hardness feeds the output's resonance slot; a name match would miss it.
        expect(usedInputStatKeys(ITEM_BUILDER_T1)).toEqual([
            ['resonance'],
            ['hardness', 'fineness'],
        ])
    })

    test('returns an empty array for an unknown recipe', () => {
        expect(usedInputStatKeys(999999)).toEqual([])
    })
})
