import {describe, expect, test} from 'bun:test'
import {availableBuildMethods} from './build-methods'
import {ITEM_HUB_T1_PACKED, ITEM_WAREHOUSE_T1_PACKED} from '../data/item-ids'

describe('availableBuildMethods', () => {
    test('orbital structures build via craft+deploy or plot', () => {
        expect(availableBuildMethods(ITEM_WAREHOUSE_T1_PACKED)).toEqual(['craft+deploy', 'plot'])
    })

    test('hub is craft+deploy only — excluded from the plot path', () => {
        expect(availableBuildMethods(ITEM_HUB_T1_PACKED)).toEqual(['craft+deploy'])
    })
})
