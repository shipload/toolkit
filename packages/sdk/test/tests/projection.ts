import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {TimePoint} from '@wharfkit/antelope'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {
    type CargoStack,
    ENTITY_CAPACITY_EXCEEDED,
    ITEM_PLATE,
    ITEM_PLASMA_CELL,
    projectEntity,
    projectRemainingAt,
    RECIPE_INPUTS_EXCESS,
    RECIPE_INPUTS_INSUFFICIENT,
    RECIPE_INPUTS_INVALID,
    RECIPE_NOT_FOUND,
    ServerContract,
    ENTITY_CARGO_NOT_LOADED,
    TaskType,
    validateSchedule,
} from '$lib'
import {
    assertProjectionEquals,
    CATALOG_FILES_REL,
    computeCatalogHash,
    type ContractProjectedState,
} from '../../src/testing'
import {registerMockItem} from '../item-mock'
import {makeShipFixture, makeTask} from '../helpers'

function getStack(cargo: CargoStack[], item_id: number, stats?: number): CargoStack | undefined {
    const statsKey = stats === undefined ? '0' : String(stats)
    return cargo.find((s) => s.item_id.toNumber() === item_id && s.stats.toString() === statsKey)
}

describe('projectEntity (stack-aware)', () => {
    describe('initial cargo', () => {
        test('returns initial cargo when no schedule', () => {
            const ship = makeShipFixture({
                cargo: [{item_id: 1, quantity: 10, stats: 100}],
            })
            const projected = projectEntity(ship)
            assert.equal(projected.cargo.length, 1)
            assert.equal(projected.cargo[0].item_id.toNumber(), 1)
            assert.equal(projected.cargo[0].quantity.toNumber(), 10)
        })

        test('returns empty cargo when none', () => {
            const ship = makeShipFixture({})
            const projected = projectEntity(ship)
            assert.deepEqual(projected.cargo, [])
        })
    })

    describe('GATHER tasks', () => {
        test('adds gathered cargo as a new stack', () => {
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

        test('merges two gathers from same deposit (same seed)', () => {
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

        test('keeps separate stacks for gathers with different seeds', () => {
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

    describe('CRAFT tasks', () => {
        test('removes inputs and adds output (last cargo entry)', () => {
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

    describe('UNWRAP', () => {
        test('UNWRAP adds cargo (mirrors LOAD)', () => {
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

    describe('TRAVEL energy', () => {
        test('deducts exactly the stored energy_cost (not a recomputed value)', () => {
            const ship = makeShipFixture({energy: 1000})
            ship.schedule = ServerContract.Types.schedule.from({
                started: '2024-06-04T23:41:09.000',
                tasks: [makeTask(TaskType.TRAVEL, {coordinates: {x: 50, y: 50}, energy_cost: 10})],
            })
            const projected = projectEntity(ship)
            assert.equal(projected.energy.toNumber(), 990)
            assert.equal(projected.location.x.toNumber(), 50)
            assert.equal(projected.location.y.toNumber(), 50)
        })

        test('floors energy at zero when stored cost exceeds current energy', () => {
            const ship = makeShipFixture({energy: 5})
            ship.schedule = ServerContract.Types.schedule.from({
                started: '2024-06-04T23:41:09.000',
                tasks: [makeTask(TaskType.TRAVEL, {coordinates: {x: 1, y: 0}, energy_cost: 100})],
            })
            const projected = projectEntity(ship)
            assert.equal(projected.energy.toNumber(), 0)
        })
    })

    describe('WARP', () => {
        test('applies stored energy_cost and moves to destination', () => {
            const ship = makeShipFixture({energy: 300})
            ship.schedule = ServerContract.Types.schedule.from({
                started: '2024-06-04T23:41:09.000',
                tasks: [
                    makeTask(TaskType.WARP, {
                        coordinates: {x: 9, y: 5},
                        energy_cost: 300,
                        duration: 0,
                    }),
                ],
            })
            const projected = projectEntity(ship)
            assert.equal(projected.energy.toNumber(), 0)
            assert.equal(projected.location.x.toNumber(), 9)
            assert.equal(projected.location.y.toNumber(), 5)
        })
    })

    describe('TRANSIT', () => {
        test('completed transit task projects entity to exit coordinates', () => {
            const ship = makeShipFixture({energy: 500})
            ship.schedule = ServerContract.Types.schedule.from({
                started: '2024-06-04T23:41:09.000',
                tasks: [
                    makeTask(TaskType.TRANSIT, {
                        coordinates: {x: 42, y: 7},
                        duration: 120,
                    }),
                ],
            })
            const projected = projectEntity(ship)
            assert.equal(projected.location.x.toNumber(), 42)
            assert.equal(projected.location.y.toNumber(), 7)
        })
    })

    describe('validateSchedule', () => {
        test('throws ENTITY_CAPACITY_EXCEEDED via validateSchedule', () => {
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

        test('does not throw when schedule stays within capacity', () => {
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

        describe('craft input validation', () => {
            // Plate recipe: [{itemId: ITEM_ORE_T1 (101), quantity: 10}] → output qty 1
            const HULL_PLATES_QTY = 10

            test('accepts valid craft inputs (Plate from 10 ore)', () => {
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
                                {item_id: ITEM_PLATE, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.doesNotThrow(() => validateSchedule(ship))
            })

            test('throws RECIPE_NOT_FOUND when output has no recipe', () => {
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

            test('throws RECIPE_INPUTS_INSUFFICIENT when quantity below required', () => {
                const ship = makeShipFixture({
                    cargo: [{item_id: 101, quantity: 5, stats: 0}],
                })
                ship.schedule = ServerContract.Types.schedule.from({
                    started: '2024-06-04T23:41:09.000',
                    tasks: [
                        makeTask(TaskType.CRAFT, {
                            cargo: [
                                {item_id: 101, quantity: 5, stats: 0},
                                {item_id: ITEM_PLATE, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.throws(() => validateSchedule(ship), RECIPE_INPUTS_INSUFFICIENT)
            })

            test('throws RECIPE_INPUTS_EXCESS when quantity above required', () => {
                const ship = makeShipFixture({
                    cargo: [{item_id: 101, quantity: 25, stats: 0}],
                })
                ship.schedule = ServerContract.Types.schedule.from({
                    started: '2024-06-04T23:41:09.000',
                    tasks: [
                        makeTask(TaskType.CRAFT, {
                            cargo: [
                                {item_id: 101, quantity: 25, stats: 0},
                                {item_id: ITEM_PLATE, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.throws(() => validateSchedule(ship), RECIPE_INPUTS_EXCESS)
            })

            test('throws RECIPE_INPUTS_INVALID when input category does not match', () => {
                // Crystal (201) offered to Plate recipe which needs ore
                const ship = makeShipFixture({
                    cargo: [{item_id: 201, quantity: HULL_PLATES_QTY, stats: 0}],
                })
                ship.schedule = ServerContract.Types.schedule.from({
                    started: '2024-06-04T23:41:09.000',
                    tasks: [
                        makeTask(TaskType.CRAFT, {
                            cargo: [
                                {item_id: 201, quantity: HULL_PLATES_QTY, stats: 0},
                                {item_id: ITEM_PLATE, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.throws(() => validateSchedule(ship), RECIPE_INPUTS_INVALID)
            })

            test('throws ENTITY_CARGO_NOT_LOADED when input not in projected cargo', () => {
                // Cargo empty but craft task declares inputs
                const ship = makeShipFixture({capacity: 10_000_000})
                ship.schedule = ServerContract.Types.schedule.from({
                    started: '2024-06-04T23:41:09.000',
                    tasks: [
                        makeTask(TaskType.CRAFT, {
                            cargo: [
                                {item_id: 101, quantity: HULL_PLATES_QTY, stats: 0},
                                {item_id: ITEM_PLATE, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.throws(() => validateSchedule(ship), ENTITY_CARGO_NOT_LOADED)
            })

            test('validates itemId-typed recipe slots (Engine from Plasma Cells)', () => {
                // Engine recipe: [{itemId: ITEM_PLASMA_CELL, quantity: 6}]
                // Use wrong item (Resonator instead of Plasma Cell) → INVALID
                const ITEM_RESONATOR = 10004
                const ITEM_ENGINE_T1_LOCAL = 10100
                const ship = makeShipFixture({
                    capacity: 10_000_000,
                    cargo: [{item_id: ITEM_RESONATOR, quantity: 6, stats: 0}],
                })
                ship.schedule = ServerContract.Types.schedule.from({
                    started: '2024-06-04T23:41:09.000',
                    tasks: [
                        makeTask(TaskType.CRAFT, {
                            cargo: [
                                {item_id: ITEM_RESONATOR, quantity: 6, stats: 0},
                                {item_id: ITEM_ENGINE_T1_LOCAL, quantity: 1, stats: 0},
                            ],
                        }),
                    ],
                })
                assert.throws(() => validateSchedule(ship), RECIPE_INPUTS_INVALID)
                // Silence unused-var warning — ITEM_PLASMA_CELL imported for clarity above
                assert.notEqual(ITEM_PLASMA_CELL, ITEM_RESONATOR)
            })
        })
    })

    // Cross-validation against the contract now lives in the `projection — fixture replay`
    // describe block below, which replays real contract-dumped projected_state via
    // assertProjectionEquals. See `make -C contracts build/projection-fixtures`.
})

describe('projectRemainingAt', () => {
    test('drains energy for an in-progress worker-lane gather (ADR 0020)', () => {
        // Gather runs on a parallel worker lane, absent from current_task/pending_tasks/schedule.
        const ship = makeShipFixture({energy: 1000})
        const gather = makeTask(TaskType.GATHER, {duration: 1000, energy_cost: 600})
        ship.lanes = [
            ServerContract.Types.lane.from({
                lane_key: 3,
                schedule: ServerContract.Types.schedule.from({
                    started: TimePoint.fromMilliseconds(Date.now() - 200_000),
                    tasks: [gather],
                }),
            }),
        ]
        ship.is_idle = false
        const projected = projectRemainingAt(ship, new Date())
        assert.equal(
            projected.energy.toNumber(),
            400,
            'in-progress worker-lane gather draw applies'
        )
    })

    test('drains energy for a completed-but-unresolved worker-lane gather', () => {
        // Resolve is lazy/entity-global: a completed draw is unsettled until resolve, so replay it.
        const ship = makeShipFixture({energy: 1000})
        const gather = makeTask(TaskType.GATHER, {duration: 60, energy_cost: 600})
        ship.lanes = [
            ServerContract.Types.lane.from({
                lane_key: 3,
                schedule: ServerContract.Types.schedule.from({
                    started: TimePoint.fromMilliseconds(Date.now() - 600_000),
                    tasks: [gather],
                }),
            }),
        ]
        ship.is_idle = false
        const projected = projectRemainingAt(ship, new Date())
        assert.equal(
            projected.energy.toNumber(),
            400,
            'completed gather draw applies before resolve'
        )
    })

    test('moves to destination for a completed-but-unresolved travel', () => {
        const ship = makeShipFixture({energy: 1000})
        const travel = makeTask(TaskType.TRAVEL, {
            coordinates: {x: 50, y: 50},
            energy_cost: 10,
            duration: 60,
        })
        ship.lanes = [
            ServerContract.Types.lane.from({
                lane_key: 0,
                schedule: ServerContract.Types.schedule.from({
                    started: TimePoint.fromMilliseconds(Date.now() - 600_000),
                    tasks: [travel],
                }),
            }),
        ]
        ship.is_idle = false
        const projected = projectRemainingAt(ship, new Date())
        assert.equal(projected.location.x.toNumber(), 50, 'completed travel reaches destination')
        assert.equal(projected.location.y.toNumber(), 50)
        assert.equal(projected.energy.toNumber(), 990, 'completed travel draw applies')
    })

    test('replays completed-but-unresolved lane tasks', () => {
        const ship = makeShipFixture({cargo: [{item_id: 5, quantity: 10, stats: 0}]})
        const completed = ServerContract.Types.schedule.from({
            started: TimePoint.fromMilliseconds(Date.now() - 600_000),
            tasks: [
                makeTask(TaskType.CRAFT, {
                    cargo: [
                        {item_id: 5, quantity: 10, stats: 0},
                        {item_id: 99, quantity: 1, stats: 0},
                    ],
                    duration: 60,
                }),
            ],
        })
        ship.lanes = [ServerContract.Types.lane.from({lane_key: 0, schedule: completed})]
        ship.is_idle = true
        const projected = projectRemainingAt(ship, new Date())
        assert.isUndefined(getStack(projected.cargo, 5), 'completed CRAFT consumes input')
        assert.equal(
            getStack(projected.cargo, 99)?.quantity.toNumber(),
            1,
            'completed CRAFT produces output'
        )
    })
})

interface FixturePayload {
    catalog_hash: string
    generated_at: string
    cases: Array<{name: string; input: unknown; task_count: number; expected: unknown}>
}

const FIXTURE_PATH = resolve(__dirname, '../fixtures/projection-cases.json')
const SDK_CATALOG_DIR = resolve(__dirname, '../../src/data')

describe('projection — fixture replay', () => {
    let payload: FixturePayload
    try {
        payload = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as FixturePayload
    } catch (e) {
        test('fixture file present (regenerate with `make -C contracts build/projection-fixtures`)', () => {
            throw new Error(`Cannot read ${FIXTURE_PATH}: ${(e as Error).message}`)
        })
        return
    }

    const currentHash = computeCatalogHash(
        CATALOG_FILES_REL.map((f) => resolve(SDK_CATALOG_DIR, f))
    )

    if (currentHash !== payload.catalog_hash) {
        test('catalog hash matches fixture (regenerate with `make -C contracts build/projection-fixtures`)', () => {
            throw new Error(
                `Projection fixture catalog hash mismatch.\n` +
                    `  fixture: ${payload.catalog_hash}\n` +
                    `  current: ${currentHash}\n` +
                    `Re-run \`make -C contracts build/projection-fixtures\` after \`make -C toolkit/packages/sdk sync-catalog\`.`
            )
        })
        return
    }

    for (const c of payload.cases) {
        test(c.name, () => {
            const inputObj = c.input as Record<string, unknown>
            const cargoJson = (inputObj.cargo as Array<Record<string, unknown>>) ?? []
            const scheduleJson = inputObj.schedule as Record<string, unknown> | undefined
            const rowJson = {...inputObj, cargo: undefined, schedule: undefined}
            delete rowJson.cargo
            delete rowJson.schedule
            rowJson.lanes =
                inputObj.lanes ?? (scheduleJson ? [{lane_key: 0, schedule: scheduleJson}] : [])
            rowJson.holds = inputObj.holds ?? []
            const row = ServerContract.Types.entity_row.from(rowJson)
            const cargo = cargoJson.map((item) =>
                ServerContract.Types.cargo_item.from({
                    item_id: Number(item.item_id),
                    stats: String(item.stats),
                    modules: (item.modules as never[]) ?? [],
                    quantity: Number(item.quantity),
                })
            )
            const sdk = projectEntity(
                {
                    coordinates: row.coordinates,
                    energy: row.energy,
                    hullmass: row.hullmass,
                    cargo,
                    cargomass: row.cargomass,
                    engines: row.engines,
                    loaders: row.loaders,
                    generator: row.generator,
                    hauler: row.hauler,
                    capacity: row.capacity,
                    owner: row.owner,
                    lanes: row.lanes,
                    stats: BigInt(row.stats.toString()),
                    item_id: row.item_id,
                    modules: row.modules,
                },
                {upToTaskIndex: c.task_count}
            )
            const expected = c.expected as ContractProjectedState
            assertProjectionEquals(expected, sdk, {step: c.task_count})
        })
    }
})
