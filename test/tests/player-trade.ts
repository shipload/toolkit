import {assert} from 'chai'
import {Player} from '$lib'
import {Int64, UInt64} from '@wharfkit/antelope'

suite('player trade simulations', function () {
    suite('withSaleNetworth', function () {
        test('should increase networth by profit on sale', function () {
            // Start: balance=1000, debt=200, networth=800
            const player = Player.from({
                owner: 'testplayer',
                balance: UInt64.from(1000),
                debt: UInt64.from(200),
                networth: Int64.from(800),
            })

            // Sell 10 units at 150 each (revenue=1500), paid 100 per unit
            // Profit: 1500 - (100*10) = 500
            const newPlayer = player.withSaleNetworth(
                UInt64.from(1500),
                UInt64.from(100),
                UInt64.from(10)
            )

            assert.equal(
                newPlayer.networth.toNumber(),
                1300,
                'Networth should increase by 500 profit'
            )
            assert.equal(
                newPlayer.balance.toNumber(),
                1000,
                'Balance unchanged by withSaleNetworth'
            )
        })

        test('should handle zero profit sale', function () {
            const player = Player.from({
                owner: 'testplayer',
                balance: UInt64.from(1000),
                debt: UInt64.from(200),
                networth: Int64.from(800),
            })

            // Sell at cost: 5 units at 100 each, paid 100 per unit
            // Profit: 500 - 500 = 0
            const newPlayer = player.withSaleNetworth(
                UInt64.from(500),
                UInt64.from(100),
                UInt64.from(5)
            )

            assert.equal(
                newPlayer.networth.toNumber(),
                800,
                'Networth unchanged on break-even sale'
            )
        })

        test('should handle loss on sale (profit = 0, not negative)', function () {
            const player = Player.from({
                owner: 'testplayer',
                balance: UInt64.from(1000),
                debt: UInt64.from(200),
                networth: Int64.from(800),
            })

            // Sell at loss: 10 units at 80 each (revenue=800), paid 100 per unit (cost=1000)
            // Loss: 800 - 1000 = -200, but profit clamped to 0
            const newPlayer = player.withSaleNetworth(
                UInt64.from(800),
                UInt64.from(100),
                UInt64.from(10)
            )

            assert.equal(
                newPlayer.networth.toNumber(),
                800,
                'Networth unchanged on loss (profit=0)'
            )
        })

        test('should handle large profit', function () {
            const player = Player.from({
                owner: 'testplayer',
                balance: UInt64.from(5000),
                debt: UInt64.from(0),
                networth: Int64.from(5000),
            })

            // Sell 100 units at 200 each (revenue=20000), paid 50 per unit
            // Profit: 20000 - (50*100) = 15000
            const newPlayer = player.withSaleNetworth(
                UInt64.from(20000),
                UInt64.from(50),
                UInt64.from(100)
            )

            assert.equal(newPlayer.networth.toNumber(), 20000, 'Networth should increase by 15000')
        })
    })

    suite('withSellGoods', function () {
        test('should update both balance and networth on sale', function () {
            // Start: balance=1000, debt=200, networth=800
            const player = Player.from({
                owner: 'testplayer',
                balance: UInt64.from(1000),
                debt: UInt64.from(200),
                networth: Int64.from(800),
            })

            // Sell 10 units at 150 each (revenue=1500), paid 100 per unit
            // Profit: 1500 - (100*10) = 500
            const newPlayer = player.withSellGoods(
                UInt64.from(1500),
                UInt64.from(100),
                UInt64.from(10)
            )

            assert.equal(newPlayer.balance.toNumber(), 2500, 'Balance should increase by 1500')
            assert.equal(newPlayer.networth.toNumber(), 1300, 'Networth should increase by 500')
        })

        test('should handle break-even sale', function () {
            const player = Player.from({
                owner: 'testplayer',
                balance: UInt64.from(1000),
                debt: UInt64.from(200),
                networth: Int64.from(800),
            })

            // Sell at cost: 5 units at 100 each, paid 100 per unit
            const newPlayer = player.withSellGoods(
                UInt64.from(500),
                UInt64.from(100),
                UInt64.from(5)
            )

            assert.equal(newPlayer.balance.toNumber(), 1500, 'Balance increases by revenue')
            assert.equal(newPlayer.networth.toNumber(), 800, 'Networth unchanged (zero profit)')
        })

        test('should handle loss on sale', function () {
            const player = Player.from({
                owner: 'testplayer',
                balance: UInt64.from(1000),
                debt: UInt64.from(200),
                networth: Int64.from(800),
            })

            // Sell at loss: 10 units at 80 each (revenue=800), paid 100 per unit
            const newPlayer = player.withSellGoods(
                UInt64.from(800),
                UInt64.from(100),
                UInt64.from(10)
            )

            assert.equal(newPlayer.balance.toNumber(), 1800, 'Balance increases by revenue')
            assert.equal(newPlayer.networth.toNumber(), 800, 'Networth unchanged (loss clamped)')
        })
    })

    suite('withBuyGoods', function () {
        test('should decrease balance on purchase', function () {
            const player = Player.from({
                owner: 'testplayer',
                balance: UInt64.from(1000),
                debt: UInt64.from(200),
                networth: Int64.from(800),
            })

            // Buy goods for 600 credits
            const newPlayer = player.withBuyGoods(UInt64.from(600))

            assert.equal(newPlayer.balance.toNumber(), 400, 'Balance should decrease by 600')
            assert.equal(
                newPlayer.networth.toNumber(),
                200,
                'Networth should update: balance - debt'
            )
        })

        test('should handle purchase that exceeds balance', function () {
            const player = Player.from({
                owner: 'testplayer',
                balance: UInt64.from(500),
                debt: UInt64.from(100),
                networth: Int64.from(400),
            })

            // Try to buy goods for 600 credits (more than balance)
            const newPlayer = player.withBuyGoods(UInt64.from(600))

            assert.equal(newPlayer.balance.toNumber(), 0, 'Balance should not go negative')
            assert.equal(newPlayer.networth.toNumber(), -100, 'Networth: 0 - 100 = -100')
        })

        test('should handle exact balance purchase', function () {
            const player = Player.from({
                owner: 'testplayer',
                balance: UInt64.from(1000),
                debt: UInt64.from(0),
                networth: Int64.from(1000),
            })

            // Buy goods for exactly available balance
            const newPlayer = player.withBuyGoods(UInt64.from(1000))

            assert.equal(newPlayer.balance.toNumber(), 0, 'Balance should be 0')
            assert.equal(newPlayer.networth.toNumber(), 0, 'Networth should be 0')
        })

        test('should update networth correctly with debt', function () {
            const player = Player.from({
                owner: 'testplayer',
                balance: UInt64.from(2000),
                debt: UInt64.from(500),
                networth: Int64.from(1500),
            })

            // Buy goods for 800 credits
            const newPlayer = player.withBuyGoods(UInt64.from(800))

            assert.equal(newPlayer.balance.toNumber(), 1200, 'Balance: 2000 - 800')
            assert.equal(newPlayer.networth.toNumber(), 700, 'Networth: 1200 - 500')
        })
    })

    suite('combined trade simulation', function () {
        test('should simulate buy-travel-sell sequence', function () {
            // Initial state
            let player = Player.from({
                owner: 'trader',
                balance: UInt64.from(10000),
                debt: UInt64.from(2000),
                networth: Int64.from(8000),
            })

            // 1. Buy goods: 50 units at 100 each = 5000 cost
            player = player.withBuyGoods(UInt64.from(5000))
            assert.equal(player.balance.toNumber(), 5000, 'After buy: balance = 5000')
            assert.equal(player.networth.toNumber(), 3000, 'After buy: networth = 3000')

            // 2. Travel (no balance/networth change)
            // ...

            // 3. Sell goods: 50 units at 150 each = 7500 revenue, paid 100 per unit
            // Profit: 7500 - (100*50) = 2500
            player = player.withSellGoods(UInt64.from(7500), UInt64.from(100), UInt64.from(50))
            assert.equal(player.balance.toNumber(), 12500, 'After sell: balance = 12500')
            assert.equal(player.networth.toNumber(), 5500, 'After sell: networth = 5500')

            // Net profit: 5500 - 3000 = 2500 (matches expected profit)
        })
    })
})
