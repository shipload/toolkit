import {describe, expect, test} from 'bun:test'
import {getEntityLayout, slotAcceptsModule} from '../src/index'
import {ITEM_GATHERER_T1, ITEM_GATHERER_T2, ITEM_ENGINE_T1} from '../src/data/item-ids'

const ship = getEntityLayout(10201)!.slots
const prospector = getEntityLayout(20210)!.slots

describe('slotAcceptsModule', () => {
    test('T1 module fits a T2 slot (ceiling, not floor)', () => {
        expect(slotAcceptsModule(prospector[3], ITEM_GATHERER_T1)).toBe(true)
    })

    test('T2 module fits a matching T2 slot', () => {
        expect(slotAcceptsModule(prospector[3], ITEM_GATHERER_T2)).toBe(true)
    })

    test('T2 module rejected by a T1 universal slot', () => {
        expect(slotAcceptsModule(ship[0], ITEM_GATHERER_T2)).toBe(false)
    })

    test('T1 module fits a T1 universal slot', () => {
        expect(slotAcceptsModule(ship[0], ITEM_GATHERER_T1)).toBe(true)
    })

    test('wrong type rejected regardless of tier', () => {
        expect(slotAcceptsModule(prospector[3], ITEM_ENGINE_T1)).toBe(false)
    })

    test('non-module items rejected', () => {
        expect(slotAcceptsModule(ship[0], 101)).toBe(false)
    })
})
