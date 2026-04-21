import {assert} from 'chai'
import {
    type CargoStack,
    ENTITY_CAPACITY_EXCEEDED,
    Item,
    projectEntity,
    ServerContract,
    TaskType,
    validateSchedule,
} from '$lib'
import {UInt16, UInt32} from '@wharfkit/antelope'
import {registerItem} from 'src/market/items'
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
    })

    suite('cross-validation against contract (synthetic — fixture deferred)', function () {
        test('gather + craft produces expected output stack matching contract semantics', function () {
            const RESOURCE_ID = 26
            const COMPONENT_ID = 10005
            const COMPONENT_MASS = 50000
            const RESOURCE_SEED = 1234
            const COMPONENT_SEED = 5678
            const INPUT_QTY = 15
            const OUTPUT_QTY = 1

            registerItem(
                Item.from({
                    id: UInt16.from(COMPONENT_ID),
                    name: 'Matter Conduit',
                    description: 'Heavy-duty metal shaft used in gathering equipment.',
                    mass: UInt32.from(COMPONENT_MASS),
                    category: 'metal',
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
