import {assert} from 'chai'
import {makeClient} from '@wharfkit/mock-data'
import Shipload, {Coordinates, ServerContract, EntityInventory} from '$lib'
import {Chains} from '@wharfkit/common'
import {Int64, UInt64} from '@wharfkit/antelope'
import {Ship} from 'src/ship'

const client = makeClient('https://jungle4.greymass.com')
const platformContractName = 'platform.gm'
const serverContractName = 'shipload.gm'

suite('ActionsManager', function () {
    let shipload: Shipload

    setup(async () => {
        shipload = await Shipload.load(Chains.Jungle4, {
            client,
            platformContractName,
            serverContractName,
        })
    })

    suite('travel', function () {
        test('creates travel action with number coordinates', function () {
            const action = shipload.actions.travel(1, {x: 5, y: 10})
            assert.equal(action.name.toString(), 'travel')
            assert.isDefined(action.data)
        })

        test('creates travel action with Int64 coordinates', function () {
            const action = shipload.actions.travel(1, {x: Int64.from(5), y: Int64.from(10)})
            assert.equal(action.name.toString(), 'travel')
            assert.isDefined(action.data)
        })

        test('creates travel action with recharge false', function () {
            const action = shipload.actions.travel(1, {x: 5, y: 10}, false)
            assert.equal(action.name.toString(), 'travel')
        })
    })

    suite('resolve', function () {
        test('creates resolve action', function () {
            const action = shipload.actions.resolve(1)
            assert.equal(action.name.toString(), 'resolve')
            assert.isDefined(action.data)
        })

        test('creates resolve action with UInt64', function () {
            const action = shipload.actions.resolve(UInt64.from(123))
            assert.equal(action.name.toString(), 'resolve')
        })
    })

    suite('buyGoods', function () {
        test('creates buygoods action', function () {
            const action = shipload.actions.buyGoods(1, 3, 10)
            assert.equal(action.name.toString(), 'buygoods')
            assert.isDefined(action.data)
        })
    })

    suite('sellGoods', function () {
        test('creates sellgoods action', function () {
            const action = shipload.actions.sellGoods(1, 3, 10)
            assert.equal(action.name.toString(), 'sellgoods')
            assert.isDefined(action.data)
        })
    })

    suite('buyShip', function () {
        test('creates buyship action', function () {
            const action = shipload.actions.buyShip('testaccount', 'My Ship')
            assert.equal(action.name.toString(), 'buyship')
            assert.isDefined(action.data)
        })
    })

    suite('takeLoan', function () {
        test('creates takeloan action', function () {
            const action = shipload.actions.takeLoan('testaccount', 1000)
            assert.equal(action.name.toString(), 'takeloan')
            assert.isDefined(action.data)
        })
    })

    suite('payLoan', function () {
        test('creates payloan action', function () {
            const action = shipload.actions.payLoan('testaccount', 500)
            assert.equal(action.name.toString(), 'payloan')
            assert.isDefined(action.data)
        })
    })

    suite('join', function () {
        test('creates join action', function () {
            const action = shipload.actions.join('newplayer')
            assert.equal(action.name.toString(), 'join')
            assert.isDefined(action.data)
        })
    })

    suite('sellAllCargo', function () {
        function createMockShip(cargo?: ServerContract.Types.cargo_item[]) {
            return Ship.fromState({
                id: 1,
                owner: 'testplayer',
                name: 'Test Ship',
                location: Coordinates.from({x: Int64.from(0), y: Int64.from(0)}),
                mass: 500000,
                capacity: 1000000000,
                energy: 5000,
                engines: ServerContract.Types.movement_stats.from({
                    thrust: 100000,
                    drain: 250,
                }),
                generator: ServerContract.Types.energy_stats.from({
                    capacity: 5000,
                    recharge: 100,
                }),
                loaders: ServerContract.Types.loader_stats.from({
                    mass: 100000,
                    quantity: 1,
                    thrust: 100,
                }),
                cargo,
            })
        }

        function createMockCargo(goodId: number, quantity: number) {
            return ServerContract.Types.cargo_item.from({
                good_id: goodId,
                quantity,
                unit_cost: 50,
            })
        }

        test('creates sell actions for loaded cargo on Ship object', function () {
            const ship = createMockShip([createMockCargo(1, 100), createMockCargo(3, 50)])

            const actions = shipload.actions.sellAllCargo(ship)

            assert.lengthOf(actions, 2)
            actions.forEach((action) => {
                assert.equal(action.name.toString(), 'sellgoods')
            })
        })

        test('skips cargo with no owned quantity', function () {
            const ship = createMockShip([createMockCargo(1, 0), createMockCargo(3, 50)])

            const actions = shipload.actions.sellAllCargo(ship)

            assert.lengthOf(actions, 1)
        })

        test('uses provided cargo array with UInt64 ship id', function () {
            const cargo = [new EntityInventory(createMockCargo(1, 100))]

            const actions = shipload.actions.sellAllCargo(UInt64.from(5), cargo)

            assert.lengthOf(actions, 1)
        })

        test('throws when cargo not provided with UInt64 ship id', function () {
            assert.throws(() => {
                shipload.actions.sellAllCargo(UInt64.from(5))
            }, 'cargo parameter required when ship is a UInt64Type')
        })

        test('uses provided cargo array even with Ship object', function () {
            const ship = createMockShip([createMockCargo(1, 100)])

            const providedCargo = [
                new EntityInventory(createMockCargo(3, 50)),
                new EntityInventory(createMockCargo(4, 30)),
            ]
            const actions = shipload.actions.sellAllCargo(ship, providedCargo)

            assert.lengthOf(actions, 2)
        })
    })
})
