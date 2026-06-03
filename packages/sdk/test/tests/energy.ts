import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {createProjectedEntity, energyAtTime, ServerContract, TaskType} from '$lib'
import {makeShipFixture, makeTask} from '../helpers'

const STARTED = '2024-06-04T23:41:09.000'

function atSeconds(entity: ReturnType<typeof makeShipFixture>, seconds: number): Date {
    return new Date(entity.schedule!.started.toDate().getTime() + seconds * 1000)
}

describe('energyAtTime', () => {
    test('interpolates energy within an active travel task', () => {
        const ship = makeShipFixture({energy: 100})
        ship.schedule = ServerContract.Types.schedule.from({
            started: STARTED,
            tasks: [
                makeTask(TaskType.TRAVEL, {
                    coordinates: {x: 10, y: 10},
                    duration: 100,
                    energy_cost: 100,
                }),
            ],
        })
        assert.closeTo(energyAtTime(ship, atSeconds(ship, 50)), 50, 0.001)
    })

    test('applies the full travel cost once the task completes', () => {
        const ship = makeShipFixture({energy: 100})
        ship.schedule = ServerContract.Types.schedule.from({
            started: STARTED,
            tasks: [
                makeTask(TaskType.TRAVEL, {
                    coordinates: {x: 10, y: 10},
                    duration: 100,
                    energy_cost: 40,
                }),
            ],
        })
        assert.closeTo(energyAtTime(ship, atSeconds(ship, 100)), 60, 0.001)
    })

    test('recharge fills toward capacity at the generator rate', () => {
        const ship = makeShipFixture({energy: 0})
        ship.schedule = ServerContract.Types.schedule.from({
            started: STARTED,
            tasks: [makeTask(TaskType.RECHARGE, {duration: 100})],
        })
        const capacity = Number(createProjectedEntity(ship).generator!.capacity)
        assert.closeTo(energyAtTime(ship, atSeconds(ship, 50)), capacity / 2, 0.001)
        assert.closeTo(energyAtTime(ship, atSeconds(ship, 100)), capacity, 0.001)
    })

    test('warp zeroes energy on completion', () => {
        const ship = makeShipFixture({energy: 300})
        ship.schedule = ServerContract.Types.schedule.from({
            started: STARTED,
            tasks: [
                makeTask(TaskType.WARP, {
                    coordinates: {x: 9, y: 5},
                    duration: 0,
                    energy_cost: 300,
                }),
            ],
        })
        assert.equal(energyAtTime(ship, atSeconds(ship, 1)), 0)
    })

    test('returns current energy when the schedule has no tasks', () => {
        const ship = makeShipFixture({energy: 123})
        ship.schedule = ServerContract.Types.schedule.from({started: STARTED, tasks: []})
        assert.equal(energyAtTime(ship, atSeconds(ship, 0)), 123)
    })
})
