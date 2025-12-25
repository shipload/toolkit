import {assert} from 'chai'
import {Int64, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {
    calculateBreakEvenPrice,
    calculateMaxTradeQuantity,
    calculateProfitPerMass,
    calculateProfitPerSecond,
    calculateROI,
    calculateTradeProfit,
    calculateUpdatedCargoCost,
    Coordinates,
    findBestGoodToTrade,
    isProfitable,
    ServerContract,
} from '$lib'
import {Ship} from 'src/ship'
import {Player} from 'src/player'
import {Good, GoodPrice, PRECISION} from 'src/types'
import {assertEq} from '../helpers'

suite('trade', function () {
    suite('calculateTradeProfit', function () {
        test('calculates profit for profitable trade', function () {
            const result = calculateTradeProfit(100, 50, 80)
            assertEq(result.revenue, 8000)
            assertEq(result.cost, 5000)
            assertEq(result.profit, 3000)
            assert.equal(result.margin, 60)
        })

        test('calculates loss for unprofitable trade', function () {
            const result = calculateTradeProfit(100, 80, 50)
            assertEq(result.revenue, 5000)
            assertEq(result.cost, 8000)
            assertEq(result.profit, -3000)
        })

        test('handles zero quantity', function () {
            const result = calculateTradeProfit(0, 50, 80)
            assertEq(result.revenue, 0)
            assertEq(result.cost, 0)
            assertEq(result.profit, 0)
        })

        test('handles zero cost', function () {
            const result = calculateTradeProfit(100, 0, 80)
            assert.equal(result.margin, 0)
        })
    })

    suite('calculateProfitPerMass', function () {
        test('calculates profit per mass unit', function () {
            const result = calculateProfitPerMass(10, 50, 100, 100)
            assert.equal(result, 0.5)
        })

        test('returns 0 for zero mass', function () {
            const result = calculateProfitPerMass(10, 50, 100, 0)
            assert.equal(result, 0)
        })
    })

    suite('calculateProfitPerSecond', function () {
        test('calculates profit per second', function () {
            const result = calculateProfitPerSecond(1000, 100)
            assert.equal(result, 10)
        })

        test('returns 0 for zero time', function () {
            const result = calculateProfitPerSecond(1000, 0)
            assert.equal(result, 0)
        })
    })

    suite('calculateBreakEvenPrice', function () {
        test('calculates break even price', function () {
            const result = calculateBreakEvenPrice(1000, 10)
            assert.equal(result, 100)
        })

        test('returns 0 for zero quantity', function () {
            const result = calculateBreakEvenPrice(1000, 0)
            assert.equal(result, 0)
        })
    })

    suite('isProfitable', function () {
        test('returns true when sell > buy', function () {
            assert.isTrue(isProfitable(50, 100))
        })

        test('returns false when sell < buy', function () {
            assert.isFalse(isProfitable(100, 50))
        })

        test('returns false when sell = buy', function () {
            assert.isFalse(isProfitable(100, 100))
        })
    })

    suite('calculateROI', function () {
        test('calculates ROI percentage', function () {
            const result = calculateROI(100, 50)
            assert.equal(result, 50)
        })

        test('returns 0 for zero cost', function () {
            const result = calculateROI(0, 50)
            assert.equal(result, 0)
        })

        test('handles negative profit', function () {
            const result = calculateROI(100, -25)
            assert.equal(result, -25)
        })
    })
    suite('calculateUpdatedCargoCost', function () {
        test('should calculate weighted average for new purchase', function () {
            // Scenario: Owned 10 units at 100 each, buying 5 more at 120 each
            // Expected: (100*10 + 600) / (10+5) = 1600/15 = 106.67 (truncated to 106)
            const currentPaid = UInt64.from(100)
            const currentOwned = UInt32.from(10)
            const purchaseCost = UInt64.from(600) // 5 * 120
            const purchaseQuantity = UInt32.from(5)

            const newPaid = calculateUpdatedCargoCost(
                currentPaid,
                currentOwned,
                purchaseCost,
                purchaseQuantity
            )

            assert.equal(newPaid.toNumber(), 106, 'Weighted average should be 106')
        })

        test('should handle first purchase (owned = 0)', function () {
            // Scenario: No cargo, buying 10 at 50 each
            // Expected: (0*0 + 500) / (0+10) = 500/10 = 50
            const currentPaid = UInt64.from(0)
            const currentOwned = UInt32.from(0)
            const purchaseCost = UInt64.from(500) // 10 * 50
            const purchaseQuantity = UInt32.from(10)

            const newPaid = calculateUpdatedCargoCost(
                currentPaid,
                currentOwned,
                purchaseCost,
                purchaseQuantity
            )

            assert.equal(newPaid.toNumber(), 50, 'First purchase cost per unit should be 50')
        })

        test('should handle buying at same price', function () {
            // Scenario: Owned 20 at 75 each, buying 10 more at 75 each
            // Expected: (75*20 + 750) / (20+10) = 2250/30 = 75
            const currentPaid = UInt64.from(75)
            const currentOwned = UInt32.from(20)
            const purchaseCost = UInt64.from(750) // 10 * 75
            const purchaseQuantity = UInt32.from(10)

            const newPaid = calculateUpdatedCargoCost(
                currentPaid,
                currentOwned,
                purchaseCost,
                purchaseQuantity
            )

            assert.equal(newPaid.toNumber(), 75, 'Cost should remain 75 when buying at same price')
        })

        test('should handle buying at higher price', function () {
            // Scenario: Owned 5 at 100 each, buying 5 more at 200 each
            // Expected: (100*5 + 1000) / (5+5) = 1500/10 = 150
            const currentPaid = UInt64.from(100)
            const currentOwned = UInt32.from(5)
            const purchaseCost = UInt64.from(1000) // 5 * 200
            const purchaseQuantity = UInt32.from(5)

            const newPaid = calculateUpdatedCargoCost(
                currentPaid,
                currentOwned,
                purchaseCost,
                purchaseQuantity
            )

            assert.equal(
                newPaid.toNumber(),
                150,
                'Average cost should increase to 150 when buying at higher price'
            )
        })

        test('should handle buying at lower price', function () {
            // Scenario: Owned 10 at 150 each, buying 20 more at 100 each
            // Expected: (150*10 + 2000) / (10+20) = 3500/30 = 116.67 (truncated to 116)
            const currentPaid = UInt64.from(150)
            const currentOwned = UInt32.from(10)
            const purchaseCost = UInt64.from(2000) // 20 * 100
            const purchaseQuantity = UInt32.from(20)

            const newPaid = calculateUpdatedCargoCost(
                currentPaid,
                currentOwned,
                purchaseCost,
                purchaseQuantity
            )

            assert.equal(
                newPaid.toNumber(),
                116,
                'Average cost should decrease to 116 when buying at lower price'
            )
        })

        test('should handle large quantities', function () {
            // Scenario: Owned 1000 at 50 each, buying 500 more at 60 each
            // Expected: (50*1000 + 30000) / (1000+500) = 80000/1500 = 53.33 (truncated to 53)
            const currentPaid = UInt64.from(50)
            const currentOwned = UInt32.from(1000)
            const purchaseCost = UInt64.from(30000) // 500 * 60
            const purchaseQuantity = UInt32.from(500)

            const newPaid = calculateUpdatedCargoCost(
                currentPaid,
                currentOwned,
                purchaseCost,
                purchaseQuantity
            )

            assert.equal(newPaid.toNumber(), 53, 'Should handle large quantities correctly')
        })

        test('should use integer division (no rounding up)', function () {
            // Scenario: Create a case where division has remainder
            // Owned 3 at 10 each, buying 1 at 15
            // Expected: (10*3 + 15) / (3+1) = 45/4 = 11.25 -> 11 (integer division)
            const currentPaid = UInt64.from(10)
            const currentOwned = UInt32.from(3)
            const purchaseCost = UInt64.from(15) // 1 * 15
            const purchaseQuantity = UInt32.from(1)

            const newPaid = calculateUpdatedCargoCost(
                currentPaid,
                currentOwned,
                purchaseCost,
                purchaseQuantity
            )

            assert.equal(newPaid.toNumber(), 11, 'Should truncate, not round (11.25 -> 11)')
        })
    })

    suite('calculateMaxTradeQuantity', function () {
        function createShip(capacity: number) {
            return Ship.fromState({
                id: 1,
                owner: 'testplayer',
                name: 'Test Ship',
                location: Coordinates.from({x: Int64.from(0), y: Int64.from(0)}),
                mass: 500000,
                capacity,
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
                cargo: [],
            })
        }

        function createPlayer(balance: number) {
            return Player.from({
                owner: 'testplayer',
                balance: UInt64.from(balance),
                debt: UInt64.from(0),
                networth: Int64.from(balance),
            })
        }

        function createGoodPrice(id: number, price: number, mass: number) {
            const good = Good.from({
                id: UInt16.from(id),
                name: `Good ${id}`,
                description: `Description for good ${id}`,
                base_price: UInt64.from(price),
                mass: UInt64.from(mass).multiplying(PRECISION),
            })
            return GoodPrice.from({
                id: UInt16.from(id),
                good,
                price: UInt64.from(price),
                supply: UInt64.from(1000),
            })
        }

        test('calculates max quantity based on balance and space', function () {
            const ship = createShip(1000000000)
            const player = createPlayer(10000)
            const goodPrice = createGoodPrice(1, 100, 35000)

            const result = calculateMaxTradeQuantity(ship, player, goodPrice)

            assert.equal(result.affordableQuantity, 100)
            assert.isAbove(result.spaceForQuantity, 0)
            assert.isAtMost(result.maxQuantity, result.affordableQuantity)
            assert.isAtMost(result.maxQuantity, result.spaceForQuantity)
        })

        test('limits by balance when low funds', function () {
            const ship = createShip(4000000000)
            const player = createPlayer(500)
            const goodPrice = createGoodPrice(1, 100, 35000)

            const result = calculateMaxTradeQuantity(ship, player, goodPrice)

            assert.equal(result.affordableQuantity, 5)
            assert.equal(result.maxQuantity, 5)
        })

        test('limits by space when ship full', function () {
            const ship = createShip(510000)
            const player = createPlayer(1000000)
            const goodPrice = createGoodPrice(1, 100, 35000)

            const result = calculateMaxTradeQuantity(ship, player, goodPrice)

            assert.isAtMost(result.maxQuantity, result.spaceForQuantity)
            assert.isBelow(result.maxQuantity, result.affordableQuantity)
        })

        test('calculates correct total cost and mass', function () {
            const ship = createShip(1000000000)
            const player = createPlayer(10000)
            const goodPrice = createGoodPrice(1, 100, 35000)

            const result = calculateMaxTradeQuantity(ship, player, goodPrice)

            assert.equal(result.totalCost, result.maxQuantity * 100)
            assert.equal(result.totalMass.toNumber(), result.maxQuantity * 35000 * PRECISION)
        })
    })

    suite('findBestGoodToTrade', function () {
        function createShip(capacity: number) {
            return Ship.fromState({
                id: 1,
                owner: 'testplayer',
                name: 'Test Ship',
                location: Coordinates.from({x: Int64.from(0), y: Int64.from(0)}),
                mass: 500000,
                capacity,
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
                cargo: [],
            })
        }

        function createPlayer(balance: number) {
            return Player.from({
                owner: 'testplayer',
                balance: UInt64.from(balance),
                debt: UInt64.from(0),
                networth: Int64.from(balance),
            })
        }

        function createGoodPrice(id: number, price: number, mass: number) {
            const good = Good.from({
                id: UInt16.from(id),
                name: `Good ${id}`,
                description: `Description for good ${id}`,
                base_price: UInt64.from(price),
                mass: UInt64.from(mass).multiplying(PRECISION),
            })
            return GoodPrice.from({
                id: UInt16.from(id),
                good,
                price: UInt64.from(price),
                supply: UInt64.from(1000),
            })
        }

        test('finds the best profitable trade', function () {
            const ship = createShip(1000000000)
            const player = createPlayer(100000)

            const originPrices = [createGoodPrice(1, 100, 35000), createGoodPrice(3, 200, 60000)]
            const destPrices = [createGoodPrice(1, 120, 35000), createGoodPrice(3, 300, 60000)]

            const result = findBestGoodToTrade(ship, player, originPrices, destPrices, 100)

            assert.isNotNull(result)
            assert.isAbove(result!.profit, 0)
            assert.isAbove(result!.profitPerSecond, 0)
        })

        test('returns null when no profitable trades', function () {
            const ship = createShip(1000000000)
            const player = createPlayer(100000)

            const originPrices = [createGoodPrice(1, 100, 35000)]
            const destPrices = [createGoodPrice(1, 80, 35000)]

            const result = findBestGoodToTrade(ship, player, originPrices, destPrices, 100)

            assert.isNull(result)
        })

        test('returns null when no matching goods', function () {
            const ship = createShip(1000000000)
            const player = createPlayer(100000)

            const originPrices = [createGoodPrice(1, 100, 35000)]
            const destPrices = [createGoodPrice(3, 200, 60000)]

            const result = findBestGoodToTrade(ship, player, originPrices, destPrices, 100)

            assert.isNull(result)
        })

        test('returns null when player cannot afford any goods', function () {
            const ship = createShip(1000000000)
            const player = createPlayer(10)

            const originPrices = [createGoodPrice(1, 100, 35000)]
            const destPrices = [createGoodPrice(1, 200, 35000)]

            const result = findBestGoodToTrade(ship, player, originPrices, destPrices, 100)

            assert.isNull(result)
        })

        test('selects trade with best profit per second', function () {
            const ship = createShip(1000000000)
            const player = createPlayer(100000)

            const originPrices = [createGoodPrice(1, 100, 35000), createGoodPrice(3, 50, 60000)]
            const destPrices = [createGoodPrice(1, 150, 35000), createGoodPrice(3, 100, 60000)]

            const result = findBestGoodToTrade(ship, player, originPrices, destPrices, 100)

            assert.isNotNull(result)
            assert.isAbove(result!.profitPerSecond, 0)
        })

        test('handles zero travel time by returning 0 profitPerSecond', function () {
            const ship = createShip(1000000000)
            const player = createPlayer(100000)

            const originPrices = [createGoodPrice(1, 100, 35000)]
            const destPrices = [createGoodPrice(1, 150, 35000)]

            const result = findBestGoodToTrade(ship, player, originPrices, destPrices, 0)

            assert.isNull(result)
        })
    })
})
