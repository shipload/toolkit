import {describe, expect, test} from 'bun:test'
import {ServerContract, TaskType} from '../index-module'
import {taskCargoChanges, taskCargoChangesChecked} from './task-cargo'

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

describe('TaskType', () => {
    test('covers the depot task types the contract defines', () => {
        expect(TaskType.DEPOT_STORE).toBe(21)
        expect(TaskType.DEPOT_TAKE).toBe(22)
    })
})

function simpleTask(type: number) {
    return ServerContract.Types.task.from({
        type,
        duration: 60,
        cancelable: 0,
        cargo: [cargoItem(401, 100)],
        couplings: [],
    })
}

describe('taskCargoChanges task coverage', () => {
    test('a depot store moves cargo out of the entity', () => {
        const changes = taskCargoChanges(simpleTask(TaskType.DEPOT_STORE))
        expect(changes).toHaveLength(1)
        expect(changes[0].direction).toBe('out')
    })

    test('a depot take moves cargo into the entity', () => {
        const changes = taskCargoChanges(simpleTask(TaskType.DEPOT_TAKE))
        expect(changes).toHaveLength(1)
        expect(changes[0].direction).toBe('in')
    })

    test('an upgrade consumes its cargo', () => {
        const changes = taskCargoChanges(simpleTask(TaskType.UPGRADE))
        expect(changes).toHaveLength(1)
        expect(changes[0].direction).toBe('out')
    })

    test('an undeploy returns cargo to the entity', () => {
        const changes = taskCargoChanges(simpleTask(TaskType.UNDEPLOY))
        expect(changes).toHaveLength(1)
        expect(changes[0].direction).toBe('in')
    })
})

describe('taskCargoChangesChecked', () => {
    test('reports a known task type with its changes', () => {
        const result = taskCargoChangesChecked(simpleTask(TaskType.DEPOT_TAKE))
        expect(result.known).toBe(true)
        if (result.known) expect(result.changes[0].direction).toBe('in')
    })

    test('distinguishes an unrecognised task type from one that moves nothing', () => {
        const unknown = taskCargoChangesChecked(simpleTask(99))
        expect(unknown.known).toBe(false)
        if (!unknown.known) expect(unknown.taskType).toBe(99)

        const travel = taskCargoChangesChecked(simpleTask(TaskType.TRAVEL))
        expect(travel.known).toBe(true)
        if (travel.known) expect(travel.changes).toHaveLength(0)
    })
})
