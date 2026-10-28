import {expect, test} from 'bun:test'
import {getItem} from '../data/catalog'
import {getEntityLayout} from '../data/recipes-runtime'
import {
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_GENERATOR_T2,
    ITEM_LOADER_T1,
} from '../data/item-ids'
import {reslotModules} from './modules'

const gathererHull = getEntityLayout(11203)?.slots ?? []

test('reslotModules places each module in the first free slot of its type', () => {
    const engine = {itemId: ITEM_ENGINE_T1}
    const generator = {itemId: ITEM_GENERATOR_T1}
    const gatherer = {itemId: ITEM_GATHERER_T1}
    const loader = {itemId: ITEM_LOADER_T1}
    const out = reslotModules([engine, generator, null, gatherer, loader], gathererHull)
    expect(out.slots).toEqual([generator, gatherer])
    expect(out.displaced).toEqual([engine, loader])
    expect(out.displacedMass).toBe(getItem(ITEM_ENGINE_T1).mass + getItem(ITEM_LOADER_T1).mass)
})

test('reslotModules displaces a second module once its slot type is taken', () => {
    const first = {itemId: ITEM_GENERATOR_T1}
    const second = {itemId: ITEM_GENERATOR_T2}
    const out = reslotModules([first, second], gathererHull)
    expect(out.slots).toEqual([first, null])
    expect(out.displaced).toEqual([second])
})
