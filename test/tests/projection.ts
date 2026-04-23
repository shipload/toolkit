import {assert} from 'chai'
import {
    type CargoStack,
    ENTITY_CAPACITY_EXCEEDED,
    Item,
    ITEM_HULL_PLATES,
    ITEM_THRUSTER_CORE,
    projectEntity,
    RECIPE_INPUTS_EXCESS,
    RECIPE_INPUTS_INSUFFICIENT,
    RECIPE_INPUTS_INVALID,
    RECIPE_INPUTS_MIXED,
    RECIPE_NOT_FOUND,
    SHIP_CARGO_NOT_LOADED,
    ServerContract,
    TaskType,
    validateSchedule,
} from '$lib'
import {UInt16, UInt32} from '@wharfkit/antelope'
import {registerMockItem} from '../item-mock'
import {makeShipFixture, makeTask} from '../helpers'

function getStack(cargo: CargoStack[], item_id: number, stats?: number): CargoStack | undefined {
    const statsKey = stats === undefined ? '0' : String(stats)
    return cargo.find((s) => s.item_id.toNumber() === item_id && s.stats.toString() === statsKey)
}

suite('projectEntity (stack-aware)', function () {
    suite('initial cargo', function () {
        test('returns initial cargo when no schedule', function () {
            const ship = makeShipFixture({
                cargo: [{item_id: 1, quantity: 10, stats: 100}],
            })
            const projected = projectEntity(ship)
            assert.equal(projected.cargo.length, 1)
            assert.equal(projected.cargo[0].item_id.toNumber(), 1)
            assert.equal(projected.cargo[0].quantity.toNumber(), 10)
        })

        test('returns empty cargo when none', function () {
            const ship = makeShipFixture({})
            const projected = projectEntity(ship)
            assert.deepEqual(projected.cargo, [])
        })
    })

    suite('GATHER tasks', function () {
        test('adds gathered cargo as a new stack', function () {
            const ship = makeShipFixture({})
            ship.schedule = ServerContract.Types.schedule.from({
                started: '2024-06-04T23:41:09.000',
                tasks: [
                    makeTask(TaskType.GATHER, {
                        cargo: [{item_id: 5, quantity: 100, stats: 200}],
                    }),
                ],
            })
            const projected = projectEntity(ship)
            assert.equal(projected.cargo.length, 1)
            assert.equal(getStack(projected.cargo, 5, 200)?.quantity.toNumber(), 100)
        })

        test('merges two gathers from same deposit (same seed)', function () {
            const ship = makeShipFixture({})
            ship.schedule = ServerContract.Types.schedule.from({
                started: '2024-06-04T23:41:09.000',
                tasks: [
                    makeTask(TaskType.GATHER, {cargo: [{item_id: 5, quantity: 30, stats: 200}]}),
                    makeTask(TaskType.GATHER, {cargo: [{item_id: 5, quantity: 70, stats: 200}]}),
                ],
            })
            const projected = projectEntity(ship)
            assert.equal(projected.cargo.length, 1, 'should merge into single stack')
            assert.equal(getStack(projected.cargo, 5, 200)?.quantity.toNumber(), 100)
        })

        test('keeps separate stacks for gathers with different seeds', function () {
            const ship = makeShipFixture({})
            ship.schedule = ServerContract.Types.schedule.from({
                started: '2024-06-04T23:41:09.000',
                tasks: [
                    makeTask(TaskType.GATHER, {cargo: [{item_id: 5, quantity: 30, stats: 200}]}),
                    makeTask(TaskType.GATHER, {cargo: [{item_id: 5, quantity: 70, stats: 300}]}),
                ],
            })
            const projected = projectEntity(ship)
            assert.equal(projected.cargo.length, 2)
        })
    })

    suite('CRAFT tasks', function () {
        test('removes inputs and adds output (last cargo entry)', function () {
            const ship = makeShipFixture({
                cargo: [
                    {item_id: 1, quantity: 5, stats: 100},
                    {item_id: 2, quantity: 3, stats: 200},
                ],
            })
            ship.schedule = ServerContract.Types.schedule.from({
                started: '2024-06-04T23:41:09.000',
                tasks: [
                    makeTask(TaskType.CRAFT, {
                        cargo: [
                            {item_id: 1, quantity: 5, stats: 100},
                            {item_id: 2, quantity: 3, stats: 200},
                            {item_id: 99, quantity: 1, stats: 999},
                        ],
                    }),
                ],
            })
            const projected = projectEntity(ship)
            assert.isUndefined(getStack(projected.cargo, 1, 100), 'input 1 should be consumed')
            assert.isUndefined(getStack(projected.cargo, 2, 200), 'input 2 should be consumed')
            assert.equal(getStack(projected.cargo, 99, 999)?.quantity.toNumber(), 1)
        })
    })

    suite('WRAP / UNWRAP', function () {
        test('WRAP removes cargo (mirrors UNLOAD)', function () {
            const ship = makeShipFixture({cargo: [{item_id: 5, quantity: 10, stats: 200}]})
            ship.schedule = ServerContract.Types.schedule.from({
                started: '2024-06-04T23:41:09.000',
                tasks: [makeTask(TaskType.WRAP, {cargo: [{item_id: 5, quantity: 4, stats: 200}]})],
            })
            const projected = projectEntity(ship)
            assert.equal(getStack(projected.cargo, 5, 200)?.quantity.toNumber(), 6)
        })

        test('UNWRAP adds cargo (mirrors LOAD)', function () {
            const ship = makeShipFixture({})
            ship.schedule = ServerContract.Types.schedule.from({
                started: '2024-06-04T23:41:09.000',
                tasks: [
                    makeTask(TaskType.UNWRAP, {cargo: [{item_id: 5, quantity: 4, stats: 200}]}),
                ],
            })
            const projected = projectEntity(ship)
            assert.equal(getStack(projected.cargo, 5, 200)?.quantity.toNumber(), 4)
        })
    })

    suite('validateSchedule', function () {
        test('throws ENTITY_CAPACITY_EXCEEDED via validateSchedule', function () {
            const ship = makeShipFixture({capacity: 100})
            ship.schedule = ServerContract.Types.schedule.from({
                started: '2024-06-04T23:41:09.000',
                tasks: [
                    makeTask(TaskType.GATHER, {
                        cargo: [{item_id: 5, quantity: 50, stats: 200}],
                    }),
                ],
            })
            assert.throws(() => validateSchedule(ship), ENTITY_CAPACITY_EXCEEDED)
        })

        test('does not throw when schedule stays within capacity', function () {
            const ship = makeShipFixture({capacity: 10_000_000})
            ship.schedule = ServerContract.Types.schedule.from({
                started: '2024-06-04T23:41:09.000',
                tasks: [
                    makeTask(TaskType.GATHER, {
                        cargo: [{item_id: 5, quantity: 10, stats: 200}],
                    }),
                ],
            })
            assert.doesNotThrow(() => validateSchedule(ship))
        })

        suite('craft input validation', function () {
            // Hull Plates recipe: [{category: 'ore', quantity: 15}] → output qty 1
            const HULL_PLATES_QTY = 15

            test('accepts valid craft inputs (Hull Plates from 15 ore)', function () {
                const ship = makeShipFixture({
                    capacity: 10_000_000,
                    cargo: [{item_id: 101, quantity: HULL_PLATES_QTY, stats: 0}],
                })
                ship.schedule = ServerContract.Types.schedule.from({
                    started: '2024-06-04T23:41:09.000',
                    tasks: [
                        makeTask(TaskType.CRAFT, {
                            cargo: [
                                {item_id: 101, quantity: HULL_PLATES_QTY, stats: 0},
                                {item_id: ITEM_HULL_PLATES, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.doesNotThrow(() => validateSchedule(ship))
            })

            test('throws RECIPE_NOT_FOUND when output has no recipe', function () {
                const ship = makeShipFixture({
                    cargo: [{item_id: 101, quantity: 10, stats: 0}],
                })
                ship.schedule = ServerContract.Types.schedule.from({
                    started: '2024-06-04T23:41:09.000',
                    tasks: [
                        makeTask(TaskType.CRAFT, {
                            cargo: [
                                {item_id: 101, quantity: 10, stats: 0},
                                {item_id: 999, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.throws(() => validateSchedule(ship), RECIPE_NOT_FOUND)
            })

            test('throws RECIPE_INPUTS_INSUFFICIENT when quantity below required', function () {
                const ship = makeShipFixture({
                    cargo: [{item_id: 101, quantity: 10, stats: 0}],
                })
                ship.schedule = ServerContract.Types.schedule.from({
                    started: '2024-06-04T23:41:09.000',
                    tasks: [
                        makeTask(TaskType.CRAFT, {
                            cargo: [
                                {item_id: 101, quantity: 10, stats: 0},
                                {item_id: ITEM_HULL_PLATES, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.throws(() => validateSchedule(ship), RECIPE_INPUTS_INSUFFICIENT)
            })

            test('throws RECIPE_INPUTS_EXCESS when quantity above required', function () {
                const ship = makeShipFixture({
                    cargo: [{item_id: 101, quantity: 20, stats: 0}],
                })
                ship.schedule = ServerContract.Types.schedule.from({
                    started: '2024-06-04T23:41:09.000',
                    tasks: [
                        makeTask(TaskType.CRAFT, {
                            cargo: [
                                {item_id: 101, quantity: 20, stats: 0},
                                {item_id: ITEM_HULL_PLATES, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.throws(() => validateSchedule(ship), RECIPE_INPUTS_EXCESS)
            })

            test('throws RECIPE_INPUTS_INVALID when input category does not match', function () {
                // Crystal (201) offered to Hull Plates recipe which needs ore
                const ship = makeShipFixture({
                    cargo: [{item_id: 201, quantity: HULL_PLATES_QTY, stats: 0}],
                })
                ship.schedule = ServerContract.Types.schedule.from({
                    started: '2024-06-04T23:41:09.000',
                    tasks: [
                        makeTask(TaskType.CRAFT, {
                            cargo: [
                                {item_id: 201, quantity: HULL_PLATES_QTY, stats: 0},
                                {item_id: ITEM_HULL_PLATES, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.throws(() => validateSchedule(ship), RECIPE_INPUTS_INVALID)
            })

            test('throws RECIPE_INPUTS_MIXED when category slot has multiple item_ids', function () {
                // Two different ore items (T1 id=101 and T2 id=102) for a single category slot
                const ship = makeShipFixture({
                    cargo: [
                        {item_id: 101, quantity: 8, stats: 0},
                        {item_id: 102, quantity: 7, stats: 0},
                    ],
                })
                ship.schedule = ServerContract.Types.schedule.from({
                    started: '2024-06-04T23:41:09.000',
                    tasks: [
                        makeTask(TaskType.CRAFT, {
                            cargo: [
                                {item_id: 101, quantity: 8, stats: 0},
                                {item_id: 102, quantity: 7, stats: 0},
                                {item_id: ITEM_HULL_PLATES, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.throws(() => validateSchedule(ship), RECIPE_INPUTS_MIXED)
            })

            test('throws SHIP_CARGO_NOT_LOADED when input not in projected cargo', function () {
                // Cargo empty but craft task declares inputs
                const ship = makeShipFixture({capacity: 10_000_000})
                ship.schedule = ServerContract.Types.schedule.from({
                    started: '2024-06-04T23:41:09.000',
                    tasks: [
                        makeTask(TaskType.CRAFT, {
                            cargo: [
                                {item_id: 101, quantity: HULL_PLATES_QTY, stats: 0},
                                {item_id: ITEM_HULL_PLATES, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.throws(() => validateSchedule(ship), SHIP_CARGO_NOT_LOADED)
            })

            test('validates itemId-typed recipe slots (Engine from Thruster Cores)', function () {
                // Engine recipe: [{itemId: ITEM_THRUSTER_CORE, quantity: 6}]
                // Use wrong item (Power Cell instead of Thruster Core) → INVALID
                const ITEM_POWER_CELL = 10004
                const ITEM_ENGINE_T1_LOCAL = 10100
                const ship = makeShipFixture({
                    capacity: 10_000_000,
                    cargo: [{item_id: ITEM_POWER_CELL, quantity: 6, stats: 0}],
                })
                ship.schedule = ServerContract.Types.schedule.from({
                    started: '2024-06-04T23:41:09.000',
                    tasks: [
                        makeTask(TaskType.CRAFT, {
                            cargo: [
                                {item_id: ITEM_POWER_CELL, quantity: 6, stats: 0},
                                {item_id: ITEM_ENGINE_T1_LOCAL, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.throws(() => validateSchedule(ship), RECIPE_INPUTS_INVALID)
                // Silence unused-var warning — ITEM_THRUSTER_CORE imported for clarity above
                assert.notEqual(ITEM_THRUSTER_CORE, ITEM_POWER_CELL)
            })
        })
    })

    suite('cross-validation against contract (synthetic — fixture deferred)', function () {
        test('gather + craft produces expected output stack matching contract semantics', function () {
            const RESOURCE_ID = 101
            const COMPONENT_ID = 10005
            const COMPONENT_MASS = 50000
            const RESOURCE_SEED = 1234
            const COMPONENT_SEED = 5678
            const INPUT_QTY = 15
            const OUTPUT_QTY = 1

            registerMockItem(
                Item.from({
                    id: UInt16.from(COMPONENT_ID),
                    name: 'Matter Conduit',
                    description: 'Heavy-duty metal shaft used in gathering equipment.',
                    mass: UInt32.from(COMPONENT_MASS),
                    category: 'ore',
                    tier: 't1',
                    color: '#7B8D9E',
                })
            )

            const ship = makeShipFixture({})
            ship.schedule = ServerContract.Types.schedule.from({
                started: '2024-06-04T23:41:09.000',
                tasks: [
                    makeTask(TaskType.GATHER, {
                        cargo: [{item_id: RESOURCE_ID, quantity: INPUT_QTY, stats: RESOURCE_SEED}],
                    }),
                    makeTask(TaskType.CRAFT, {
                        cargo: [
                            {item_id: RESOURCE_ID, quantity: INPUT_QTY, stats: RESOURCE_SEED},
                            {item_id: COMPONENT_ID, quantity: OUTPUT_QTY, stats: COMPONENT_SEED},
                        ],
                    }),
                ],
            })
            const projected = projectEntity(ship)
            assert.equal(projected.cargo.length, 1, 'expected single output stack')
            assert.equal(projected.cargo[0].item_id.toNumber(), COMPONENT_ID)
            assert.equal(projected.cargo[0].quantity.toNumber(), OUTPUT_QTY)
            assert.equal(
                projected.cargoMass.toNumber(),
                COMPONENT_MASS * OUTPUT_QTY,
                'cargoMass should match component mass × quantity'
            )
        })
    })
})
