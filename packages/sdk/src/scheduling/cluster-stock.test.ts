import {describe, expect, test} from 'bun:test'
import {ServerContract, TaskType} from '../index-module'
import {availableForItem} from './availability'
import {clusterStockAvailable} from './cluster-stock'

const AT = new Date('2026-06-19T00:00:00')

function cargoItem(itemId: number, stats: number, quantity: number) {
    return ServerContract.Types.cargo_item.from({item_id: itemId, stats, modules: [], quantity})
}

function member(cargo: ReturnType<typeof cargoItem>[]) {
    return {cargo, tasks: [], lanes: []} as unknown as Parameters<
        typeof clusterStockAvailable
    >[0][number]
}

describe('clusterStockAvailable', () => {
    test('sums the same item split across two members', () => {
        const stock = clusterStockAvailable(
            [member([cargoItem(1001, 0, 30)]), member([cargoItem(1001, 0, 20)])],
            AT
        )
        expect(availableForItem(stock, 1001)).toBe(50n)
    })

    test('an empty cluster yields nothing', () => {
        const stock = clusterStockAvailable([], AT)
        expect(availableForItem(stock, 1001)).toBe(0n)
    })
})
