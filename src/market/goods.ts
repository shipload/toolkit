import {UInt16, UInt16Type, UInt32} from '@wharfkit/antelope'
import {Good} from '../types'
import goodsData from '../data/goods.json'

const goods = goodsData as Array<{
    id: number
    name: string
    description: string
    base_price: number
    mass: number
}>

export const goodIds = goods.map((g) => g.id)

export function getGood(goodId: UInt16Type): Good {
    const good = goods.find((g) => UInt16.from(goodId).equals(g.id))
    if (!good) {
        throw new Error('Good does not exist')
    }
    return Good.from({
        id: UInt16.from(good.id),
        name: good.name,
        description: good.description,
        base_price: UInt32.from(good.base_price),
        mass: UInt32.from(good.mass),
    })
}

export function getGoods(): Good[] {
    return goods.map((g) => getGood(g.id))
}
