import {describe, expect, test} from 'bun:test'
import {TimePoint, UInt8, UInt16, UInt32} from '@wharfkit/antelope'
import {ServerContract} from '../src/contracts'
import {TaskType} from '../src/types'
import {LANE_MOBILITY} from '../src/scheduling/schedule'
import {projectEntityAt, projectRemainingAt} from '../src/scheduling/projection'
import {makeTask} from './helpers'

const STARTED = '2024-06-04T00:00:00.000'
const NOW = new Date('2024-06-04T00:00:00.000Z')

function lane(laneKey: number, tasks: ServerContract.Types.task[]) {
    return ServerContract.Types.lane.from({
        lane_key: UInt8.from(laneKey),
        schedule: ServerContract.Types.schedule.from({
            started: TimePoint.from(STARTED),
            tasks,
        }),
    })
}

function shipWith(task: ServerContract.Types.task, cargoQty: number) {
    return {
        coordinates: {x: 0, y: 0},
        energy: UInt16.from(1000),
        hullmass: UInt32.from(1000),
        capacity: UInt32.from(1_000_000),
        cargo: cargoQty
            ? [
                  ServerContract.Types.cargo_item.from({
                      item_id: UInt16.from(201),
                      quantity: UInt32.from(cargoQty),
                      stats: 0,
                      modules: [],
                  }),
              ]
            : [],
        cargomass: UInt32.from(0),
        lanes: [lane(LANE_MOBILITY, [task])],
    }
}

describe('projectRemainingAt mirrors calc_task_effect cargo deltas', () => {
    test('pending depot store removes its bundle from projected cargo', () => {
        const task = makeTask(TaskType.CIVIC_DEPOSIT, {cargo: [{item_id: 201, quantity: 100}]})
        const projected = projectRemainingAt(shipWith(task, 100) as never, NOW)
        expect(projected.cargo).toEqual([])
        expect(projected.cargoMass.toNumber()).toBe(0)
    })

    test('pending contribute removes its bundle from projected cargo', () => {
        const task = makeTask(TaskType.CONTRIBUTE, {cargo: [{item_id: 201, quantity: 100}]})
        const projected = projectRemainingAt(shipWith(task, 100) as never, NOW)
        expect(projected.cargo).toEqual([])
    })

    test('pending upgrade removes its materials from projected cargo', () => {
        const task = makeTask(TaskType.UPGRADE, {cargo: [{item_id: 201, quantity: 100}]})
        const projected = projectRemainingAt(shipWith(task, 100) as never, NOW)
        expect(projected.cargo).toEqual([])
    })

    test('pending depot take adds its bundle to projected cargo', () => {
        const task = makeTask(TaskType.CIVIC_WITHDRAW, {cargo: [{item_id: 201, quantity: 100}]})
        const projected = projectRemainingAt(shipWith(task, 0) as never, NOW)
        expect(projected.cargo.length).toBe(1)
        expect(projected.cargo[0].quantity.toNumber()).toBe(100)
    })

    test('projectEntityAt drops a completed depot store from projected cargo', () => {
        const task = makeTask(TaskType.CIVIC_DEPOSIT, {
            duration: 60,
            cargo: [{item_id: 201, quantity: 100}],
        })
        const after = new Date(NOW.getTime() + 120_000)
        const projected = projectEntityAt(shipWith(task, 100) as never, after)
        expect(projected.cargo).toEqual([])
    })

    test('pending undeploy adds its bundle to projected cargo', () => {
        const task = makeTask(TaskType.UNDEPLOY, {cargo: [{item_id: 201, quantity: 1}]})
        const projected = projectRemainingAt(shipWith(task, 0) as never, NOW)
        expect(projected.cargo.length).toBe(1)
    })
})
