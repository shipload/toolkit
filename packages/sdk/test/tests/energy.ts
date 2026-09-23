import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {TimePoint, UInt32} from '@wharfkit/antelope'
import {
    createProjectedEntity,
    energyAtTime,
    energyDrawsFunded,
    hostedCraftEnergyFunded,
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

// Parity with craftjob's hosted-energy gate, which self-resolves finished tasks first.
describe('hostedCraftEnergyFunded', () => {
    function shipWithTasks(energy: number, tasks: ServerContract.Types.task[]) {
        const ship = makeShipFixture({energy})
        ship.schedule = ServerContract.Types.schedule.from({started: STARTED, tasks})
        return ship
    }

    test('an in-progress draw is not folded into the base and is checked at full cost', () => {
        const ship = shipWithTasks(100, [
            makeTask(TaskType.TRAVEL, {coordinates: {x: 1, y: 1}, duration: 100, energy_cost: 60}),
        ])
        assert.isTrue(hostedCraftEnergyFunded(ship, 30, atSeconds(ship, 50)))
    })

    test('an in-progress recharge is not credited early against the stored row energy', () => {
        const ship = shipWithTasks(10, [makeTask(TaskType.RECHARGE, {duration: 100})])
        assert.isFalse(hostedCraftEnergyFunded(ship, 30, atSeconds(ship, 50)))
    })

    test('a landed recharge fills the base to capacity before the cost check', () => {
        const ship = shipWithTasks(0, [makeTask(TaskType.RECHARGE, {duration: 100})])
        const capacity = Number(createProjectedEntity(ship).generator!.capacity)
        assert.isTrue(hostedCraftEnergyFunded(ship, capacity, atSeconds(ship, 100)))
        assert.isFalse(hostedCraftEnergyFunded(ship, capacity, atSeconds(ship, 50)))
    })

    test('a completed travel draw is folded into the base before the cost check', () => {
        const ship = shipWithTasks(100, [
            makeTask(TaskType.TRAVEL, {coordinates: {x: 1, y: 1}, duration: 100, energy_cost: 40}),
        ])
        assert.isTrue(hostedCraftEnergyFunded(ship, 50, atSeconds(ship, 100)))
        assert.isFalse(hostedCraftEnergyFunded(ship, 61, atSeconds(ship, 100)))
    })

    test('a completed draw folds first, then an unfinished draw behind it is checked from what remains', () => {
        const ship = shipWithTasks(100, [
            makeTask(TaskType.TRAVEL, {coordinates: {x: 1, y: 1}, duration: 50, energy_cost: 40}),
            makeTask(TaskType.CRAFT, {duration: 100, energy_cost: 50}),
        ])
        const at = atSeconds(ship, 60)
        assert.isTrue(hostedCraftEnergyFunded(ship, 10, at))
        assert.isFalse(hostedCraftEnergyFunded(ship, 11, at))
    })

    test('an anchored snapshot does not re-fold a completed travel draw already applied to row energy', () => {
        const ship = shipWithTasks(40, [
            makeTask(TaskType.TRAVEL, {coordinates: {x: 1, y: 1}, duration: 50, energy_cost: 60}),
        ])
        ship.projected_at = TimePoint.fromMilliseconds(atSeconds(ship, 50).getTime())
        assert.isTrue(hostedCraftEnergyFunded(ship, 30, atSeconds(ship, 100)))
    })

    test('an anchored snapshot does not re-fold a completed WARP already applied to row energy', () => {
        const ship = shipWithTasks(50, [
            makeTask(TaskType.WARP, {coordinates: {x: 1, y: 1}, duration: 50, energy_cost: 50}),
        ])
        ship.projected_at = TimePoint.fromMilliseconds(atSeconds(ship, 50).getTime())
        assert.isTrue(hostedCraftEnergyFunded(ship, 30, atSeconds(ship, 100)))
    })

    test('a queued recharge cannot launder a draw that leaves projected end energy below cost', () => {
        const ship = shipWithTasks(0, [])
        const capacity = Number(createProjectedEntity(ship).generator!.capacity)
        const drawCost = 60_000
        ship.energy = UInt32.from(capacity)
        ship.schedule = ServerContract.Types.schedule.from({
            started: STARTED,
            tasks: [
                makeTask(TaskType.RECHARGE, {duration: 50}),
                makeTask(TaskType.TRAVEL, {
                    coordinates: {x: 1, y: 1},
                    duration: 50,
                    energy_cost: drawCost,
                }),
            ],
        })
        // A funded walk alone would pass, since the recharge refills to capacity ahead of the draw.
        assert.isFalse(hostedCraftEnergyFunded(ship, capacity - drawCost + 1, atSeconds(ship, 0)))
    })

    test('an anchor between two completions folds only the one the snapshot already applied', () => {
        const ship = shipWithTasks(80, [
            makeTask(TaskType.TRAVEL, {coordinates: {x: 1, y: 1}, duration: 50, energy_cost: 20}),
            makeTask(TaskType.TRAVEL, {coordinates: {x: 2, y: 2}, duration: 50, energy_cost: 30}),
        ])
        ship.projected_at = TimePoint.fromMilliseconds(atSeconds(ship, 60).getTime())
        assert.isTrue(hostedCraftEnergyFunded(ship, 40, atSeconds(ship, 120)))
        assert.isFalse(hostedCraftEnergyFunded(ship, 51, atSeconds(ship, 120)))
    })

    // makeTask's energy_cost narrows to UInt16; the real field is UInt32, so a cost above 65535 is built directly.
    function taskWithU32Cost(
        type: number,
        overrides: {duration: number; energyCost: number; coordinates?: {x: number; y: number}}
    ): ServerContract.Types.task {
        return ServerContract.Types.task.from({
            type: UInt32.from(type),
            duration: UInt32.from(overrides.duration),
            cancelable: 0,
            coordinates: overrides.coordinates,
            cargo: [],
            couplings: [],
            energy_cost: UInt32.from(overrides.energyCost),
        })
    }

    describe('rechargeAppended', () => {
        test('a queued recharge followed by a draw that strands projected energy is funded once recharge is appended', () => {
            const ship = shipWithTasks(0, [])
            const capacity = Number(createProjectedEntity(ship).generator!.capacity)
            const row = Math.floor(capacity * 0.6)
            const draw = Math.floor(capacity * 0.7)
            const cost = Math.floor(capacity * 0.4)
            ship.energy = UInt32.from(row)
            ship.schedule = ServerContract.Types.schedule.from({
                started: STARTED,
                tasks: [
                    makeTask(TaskType.RECHARGE, {duration: 100}),
                    taskWithU32Cost(TaskType.TRAVEL, {
                        coordinates: {x: 1, y: 1},
                        duration: 100,
                        energyCost: draw,
                    }),
                ],
            })
            const at = atSeconds(ship, 0)
            assert.isFalse(hostedCraftEnergyFunded(ship, cost, at))
            assert.isTrue(hostedCraftEnergyFunded(ship, cost, at, {rechargeAppended: true}))
        })

        test('rechargeAppended does not launder a row already short at the check time', () => {
            const ship = shipWithTasks(10, [])
            assert.isFalse(
                hostedCraftEnergyFunded(ship, 30, atSeconds(ship, 0), {rechargeAppended: true})
            )
        })

        test('rechargeAppended does not launder a shortfall later in the funded walk', () => {
            const ship = shipWithTasks(100, [
                makeTask(TaskType.TRAVEL, {
                    coordinates: {x: 1, y: 1},
                    duration: 50,
                    energy_cost: 40,
                }),
                taskWithU32Cost(TaskType.CRAFT, {duration: 50, energyCost: 1_000_000}),
            ])
            assert.isFalse(
                hostedCraftEnergyFunded(ship, 10, atSeconds(ship, 0), {rechargeAppended: true})
            )
        })
    })
})
