import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {
    createProjectedEntity,
    energyAtTime,
    energyDrawsFunded,
    ServerContract,
    TaskType,
} from '$lib'
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

// Parity with energy_draws_funded / walk_pending_energy.
describe('energyDrawsFunded', () => {
    function shipWithTasks(energy: number, tasks: ServerContract.Types.task[]) {
        const ship = makeShipFixture({energy})
        ship.schedule = ServerContract.Types.schedule.from({started: STARTED, tasks})
        return ship
    }

    test('an empty schedule is always funded', () => {
        const ship = shipWithTasks(0, [])
        assert.isTrue(energyDrawsFunded(ship, 0))
    })

    test('travel draws its cost when funded', () => {
        const ship = shipWithTasks(100, [
            makeTask(TaskType.TRAVEL, {coordinates: {x: 5, y: 5}, energy_cost: 40}),
        ])
        assert.isTrue(energyDrawsFunded(ship, 100))
    })

    test('travel fails funding when the base energy cannot cover its cost', () => {
        const ship = shipWithTasks(100, [
            makeTask(TaskType.TRAVEL, {coordinates: {x: 5, y: 5}, energy_cost: 150}),
        ])
        assert.isFalse(energyDrawsFunded(ship, 100))
    })

    test('a travel task with no coordinates never deducts, but a funded one behind it still can', () => {
        const ship = shipWithTasks(100, [
            makeTask(TaskType.TRAVEL, {energy_cost: 40}),
            makeTask(TaskType.TRAVEL, {coordinates: {x: 1, y: 1}, energy_cost: 90}),
        ])
        assert.isTrue(energyDrawsFunded(ship, 100))
    })

    test('gather draws its cost when funded', () => {
        const ship = shipWithTasks(100, [makeTask(TaskType.GATHER, {energy_cost: 30})])
        assert.isTrue(energyDrawsFunded(ship, 100))
    })

    test('gather fails funding when underfunded', () => {
        const ship = shipWithTasks(20, [makeTask(TaskType.GATHER, {energy_cost: 30})])
        assert.isFalse(energyDrawsFunded(ship, 20))
    })

    test('craft draws its cost when funded', () => {
        const ship = shipWithTasks(100, [makeTask(TaskType.CRAFT, {energy_cost: 25})])
        assert.isTrue(energyDrawsFunded(ship, 100))
    })

    test('buildplot draws its cost when funded', () => {
        const ship = shipWithTasks(100, [makeTask(TaskType.BUILDPLOT, {energy_cost: 15})])
        assert.isTrue(energyDrawsFunded(ship, 100))
    })

    test('charge draws its cost when funded', () => {
        const ship = shipWithTasks(100, [makeTask(TaskType.CHARGE, {energy_cost: 10})])
        assert.isTrue(energyDrawsFunded(ship, 100))
    })

    test('upgrade draws its cost when funded', () => {
        const ship = shipWithTasks(100, [makeTask(TaskType.UPGRADE, {energy_cost: 20})])
        assert.isTrue(energyDrawsFunded(ship, 100))
    })

    test('a civic deposit draws its cost when funded', () => {
        const ship = shipWithTasks(100, [makeTask(TaskType.CIVIC_DEPOSIT, {energy_cost: 35})])
        assert.isTrue(energyDrawsFunded(ship, 100))
    })

    test('warp zeroes energy on completion when funded', () => {
        const ship = shipWithTasks(300, [
            makeTask(TaskType.WARP, {coordinates: {x: 9, y: 5}, energy_cost: 300}),
        ])
        assert.isTrue(energyDrawsFunded(ship, 300))
    })

    test('warp zeroes energy even without coordinates, unlike travel', () => {
        const ship = shipWithTasks(300, [makeTask(TaskType.WARP, {energy_cost: 300})])
        assert.isTrue(energyDrawsFunded(ship, 300))
    })

    test('warp zeroes energy even with no cost set, since draw_funded is false for a costless task', () => {
        const ship = shipWithTasks(300, [makeTask(TaskType.WARP, {coordinates: {x: 9, y: 5}})])
        assert.isTrue(energyDrawsFunded(ship, 300))
    })

    test('warp fails funding when underfunded', () => {
        const ship = shipWithTasks(100, [
            makeTask(TaskType.WARP, {coordinates: {x: 9, y: 5}, energy_cost: 300}),
        ])
        assert.isFalse(energyDrawsFunded(ship, 100))
    })

    test('recharge fills to capacity before a later draw', () => {
        const ship = shipWithTasks(0, [
            makeTask(TaskType.RECHARGE, {duration: 50}),
            makeTask(TaskType.CRAFT, {energy_cost: 40}),
        ])
        assert.isTrue(energyDrawsFunded(ship, 0))
    })

    test('a task type with no energy trait never draws, even when it carries a cost', () => {
        const ship = shipWithTasks(50, [makeTask(TaskType.DEMOLISH, {energy_cost: 30})])
        assert.isTrue(energyDrawsFunded(ship, 50))
    })

    test('a no-effect task with a cost still gates on funding', () => {
        const ship = shipWithTasks(20, [makeTask(TaskType.DEMOLISH, {energy_cost: 30})])
        assert.isFalse(energyDrawsFunded(ship, 20))
    })

    test('a queue fails funding at the first underfunded task, not the last', () => {
        const ship = shipWithTasks(50, [
            makeTask(TaskType.TRAVEL, {coordinates: {x: 1, y: 1}, energy_cost: 40}),
            makeTask(TaskType.CRAFT, {energy_cost: 40}),
        ])
        assert.isFalse(energyDrawsFunded(ship, 50))
    })

    test('a fully funded multi-task queue passes', () => {
        const ship = shipWithTasks(50, [
            makeTask(TaskType.TRAVEL, {coordinates: {x: 1, y: 1}, energy_cost: 20}),
            makeTask(TaskType.CRAFT, {energy_cost: 20}),
        ])
        assert.isTrue(energyDrawsFunded(ship, 50))
    })
})
