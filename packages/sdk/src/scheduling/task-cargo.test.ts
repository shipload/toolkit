import {describe, expect, test} from 'bun:test'
import {ServerContract, TaskType} from '../index-module'
import {taskCargoChanges} from './task-cargo'

function cargoItem(itemId: number, quantity: number) {
    return ServerContract.Types.cargo_item.from({item_id: itemId, stats: 0, modules: [], quantity})
}

function craftTask(couplings: ReturnType<typeof coupling>[]) {
    return ServerContract.Types.task.from({
        type: TaskType.CRAFT,
        duration: 60,
        cancelable: 0,
        cargo: [cargoItem(401, 19680), cargoItem(10008, 1968)],
        couplings,
    })
}

function coupling() {
    return ServerContract.Types.coupling.from({
        counterpart: {entity_type: 'warehouse', entity_id: 51},
        hold: 1,
        kind: 3,
    })
}

describe('taskCargoChanges', () => {
    test('a self-craft consumes inputs and delivers the output to the crafter', () => {
        const changes = taskCargoChanges(craftTask([]))

        expect(changes).toEqual([
            {direction: 'out', item_id: 401, stats: 0n, modules: [], quantity: 19680},
            {direction: 'in', item_id: 10008, stats: 0n, modules: [], quantity: 1968},
        ])
    })

    test('a coupled craft consumes inputs but does not deliver the output to the crafter', () => {
        const changes = taskCargoChanges(craftTask([coupling()]))

        expect(changes).toEqual([
            {direction: 'out', item_id: 401, stats: 0n, modules: [], quantity: 19680},
        ])
    })
})
