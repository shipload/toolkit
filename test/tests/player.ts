import {assert} from 'chai'
import {Int64, UInt64} from '@wharfkit/antelope'
import {Player} from 'src/player'

function makeTestPlayer(balance: number, debt: number) {
    return Player.from({
        owner: 'testplayer',
        balance: UInt64.from(balance),
        debt: UInt64.from(debt),
        networth: Int64.from(balance - debt),
    })
}

suite('Player', function () {
    suite('setShipCount and shipCount', function () {
        test('sets and gets ship count', function () {
            const player = makeTestPlayer(1000, 0)
            assert.isUndefined(player.shipCount)
            player.setShipCount(3)
            assert.equal(player.shipCount, 3)
        })
    })

    suite('getNextShipCost', function () {
        test('calculates cost for first ship', function () {
            const player = makeTestPlayer(1000, 0)
            assert.equal(player.getNextShipCost(0).toNumber(), 500)
        })

        test('calculates cost for second ship', function () {
            const player = makeTestPlayer(1000, 0)
            assert.equal(player.getNextShipCost(1).toNumber(), 2500)
        })

        test('calculates cost for third ship', function () {
            const player = makeTestPlayer(1000, 0)
            assert.equal(player.getNextShipCost(2).toNumber(), 12500)
        })

        test('uses cached ship count if available', function () {
            const player = makeTestPlayer(1000, 0)
            player.setShipCount(2)
            assert.equal(player.getNextShipCost().toNumber(), 12500)
        })

        test('defaults to 0 ships if no count set', function () {
            const player = makeTestPlayer(1000, 0)
            assert.equal(player.getNextShipCost().toNumber(), 500)
        })
    })

    suite('nextShipCost', function () {
        test('uses cached ship count', function () {
            const player = makeTestPlayer(1000, 0)
            player.setShipCount(1)
            assert.equal(player.nextShipCost.toNumber(), 2500)
        })
    })

    suite('canBuyShip', function () {
        test('returns true when can afford', function () {
            const player = makeTestPlayer(1000, 0)
            assert.isTrue(player.canBuyShip(0))
        })

        test('returns false when cannot afford', function () {
            const player = makeTestPlayer(50, 0)
            assert.isFalse(player.canBuyShip(0))
        })

        test('uses cached ship count', function () {
            const player = makeTestPlayer(1000, 0)
            player.setShipCount(2)
            assert.isFalse(player.canBuyShip())
        })
    })

    suite('availableLoan', function () {
        test('returns max loan when no debt', function () {
            const player = makeTestPlayer(1000, 0)
            assert.equal(player.availableLoan.toNumber(), 1000000)
        })

        test('returns remaining available', function () {
            const player = makeTestPlayer(1000, 300000)
            assert.equal(player.availableLoan.toNumber(), 700000)
        })

        test('returns 0 when at max debt', function () {
            const player = makeTestPlayer(1000, 1000000)
            assert.equal(player.availableLoan.toNumber(), 0)
        })

        test('returns 0 when over max debt', function () {
            const player = makeTestPlayer(1000, 1500000)
            assert.equal(player.availableLoan.toNumber(), 0)
        })
    })

    suite('canTakeLoan', function () {
        test('returns true when available', function () {
            const player = makeTestPlayer(1000, 0)
            assert.isTrue(player.canTakeLoan)
        })

        test('returns false at max debt', function () {
            const player = makeTestPlayer(1000, 1000000)
            assert.isFalse(player.canTakeLoan)
        })
    })

    suite('canPayLoan', function () {
        test('returns true when has debt and balance', function () {
            const player = makeTestPlayer(1000, 500)
            assert.isTrue(player.canPayLoan)
        })

        test('returns false when no debt', function () {
            const player = makeTestPlayer(1000, 0)
            assert.isFalse(player.canPayLoan)
        })

        test('returns false when no balance', function () {
            const player = makeTestPlayer(0, 500)
            assert.isFalse(player.canPayLoan)
        })
    })

    suite('maxPayback', function () {
        test('returns debt when debt < balance', function () {
            const player = makeTestPlayer(1000, 500)
            assert.equal(player.maxPayback.toNumber(), 500)
        })

        test('returns balance when balance < debt', function () {
            const player = makeTestPlayer(300, 500)
            assert.equal(player.maxPayback.toNumber(), 300)
        })
    })

    suite('MAX_LOAN_LIMIT', function () {
        test('returns max loan constant', function () {
            assert.equal(Player.MAX_LOAN_LIMIT, 1000000)
        })
    })

    suite('hasDebt', function () {
        test('returns true when debt > 0', function () {
            const player = makeTestPlayer(1000, 500)
            assert.isTrue(player.hasDebt)
        })

        test('returns false when debt = 0', function () {
            const player = makeTestPlayer(1000, 0)
            assert.isFalse(player.hasDebt)
        })
    })

    suite('isSolvent', function () {
        test('returns true when networth >= 0', function () {
            const player = makeTestPlayer(1000, 500)
            assert.isTrue(player.isSolvent)
        })

        test('returns true when networth = 0', function () {
            const player = makeTestPlayer(500, 500)
            assert.isTrue(player.isSolvent)
        })

        test('returns false when networth < 0', function () {
            const player = Player.from({
                owner: 'testplayer',
                balance: UInt64.from(500),
                debt: UInt64.from(1000),
                networth: Int64.from(-500),
            })
            assert.isFalse(player.isSolvent)
        })
    })

    suite('withBalanceChange', function () {
        test('adds positive amount', function () {
            const player = makeTestPlayer(1000, 200)
            const newPlayer = player.withBalanceChange(UInt64.from(500))
            assert.equal(newPlayer.balance.toNumber(), 1500)
            assert.equal(newPlayer.networth.toNumber(), 1300)
        })

        test('subtracts negative number', function () {
            const player = makeTestPlayer(1000, 200)
            const newPlayer = player.withBalanceChange(-300)
            assert.equal(newPlayer.balance.toNumber(), 700)
            assert.equal(newPlayer.networth.toNumber(), 500)
        })

        test('does not go below 0', function () {
            const player = makeTestPlayer(200, 0)
            const newPlayer = player.withBalanceChange(-500)
            assert.equal(newPlayer.balance.toNumber(), 0)
        })
    })

    suite('withDebtChange', function () {
        test('adds positive amount', function () {
            const player = makeTestPlayer(1000, 200)
            const newPlayer = player.withDebtChange(UInt64.from(300))
            assert.equal(newPlayer.debt.toNumber(), 500)
            assert.equal(newPlayer.networth.toNumber(), 500)
        })

        test('subtracts negative number', function () {
            const player = makeTestPlayer(1000, 500)
            const newPlayer = player.withDebtChange(-200)
            assert.equal(newPlayer.debt.toNumber(), 300)
            assert.equal(newPlayer.networth.toNumber(), 700)
        })

        test('does not go below 0', function () {
            const player = makeTestPlayer(1000, 200)
            const newPlayer = player.withDebtChange(-500)
            assert.equal(newPlayer.debt.toNumber(), 0)
        })
    })

    suite('withLoan', function () {
        test('increases both balance and debt', function () {
            const player = makeTestPlayer(1000, 200)
            const newPlayer = player.withLoan(UInt64.from(500))
            assert.equal(newPlayer.balance.toNumber(), 1500)
            assert.equal(newPlayer.debt.toNumber(), 700)
            assert.equal(newPlayer.networth.toNumber(), 800)
        })
    })

    suite('withLoanPayment', function () {
        test('decreases both balance and debt', function () {
            const player = makeTestPlayer(1000, 500)
            const newPlayer = player.withLoanPayment(UInt64.from(300))
            assert.equal(newPlayer.balance.toNumber(), 700)
            assert.equal(newPlayer.debt.toNumber(), 200)
            assert.equal(newPlayer.networth.toNumber(), 500)
        })

        test('limits to max payback', function () {
            const player = makeTestPlayer(200, 500)
            const newPlayer = player.withLoanPayment(UInt64.from(1000))
            assert.equal(newPlayer.balance.toNumber(), 0)
            assert.equal(newPlayer.debt.toNumber(), 300)
        })
    })
})
