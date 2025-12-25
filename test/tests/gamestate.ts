import {assert} from 'chai'
import {Checksum256, TimePointSec, UInt32, UInt64} from '@wharfkit/antelope'
import {GameState, PlatformContract, ServerContract} from '$lib'

function createMockStateRow(
    overrides: Partial<{
        enabled: boolean
        epoch: number
        seed: string
        salt: number
        ships: number
        commit: string
    }> = {}
) {
    return ServerContract.Types.state_row.from({
        enabled: overrides.enabled ?? true,
        epoch: UInt64.from(overrides.epoch ?? 5),
        seed: overrides.seed ?? 'abcd'.repeat(16),
        salt: UInt64.from(overrides.salt ?? 12345),
        ships: UInt64.from(overrides.ships ?? 100),
        commit: overrides.commit ?? 'ef01'.repeat(16),
    })
}

function createMockGame(startTimestamp: number, epochtime: number) {
    const startSeconds = Math.floor(startTimestamp / 1000)
    const endSeconds = startSeconds + 60 * 60 * 24 * 365
    return PlatformContract.Types.game_row.from({
        contract: 'shipload.gm',
        config: {
            start: TimePointSec.fromMilliseconds(startTimestamp),
            end: TimePointSec.fromMilliseconds(endSeconds * 1000),
            epochtime: UInt32.from(epochtime),
            seed: 'beef'.repeat(16),
        },
        meta: {
            name: 'Test Game',
            description: 'Test game description',
            url: 'https://test.com',
            version: '1.0.0',
        },
        state: {
            enabled: true,
        },
    })
}

suite('GameState', function () {
    suite('from', function () {
        test('creates GameState from state_row without game', function () {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            assert.instanceOf(gameState, GameState)
            assert.equal(gameState.epoch.toNumber(), 5)
        })

        test('creates GameState from state_row with game', function () {
            const stateRow = createMockStateRow()
            const game = createMockGame(Date.now(), 3600)
            const gameState = GameState.from(stateRow, game)

            assert.instanceOf(gameState, GameState)
            assert.isDefined(gameState.gameSeed)
        })
    })

    suite('setGame', function () {
        test('sets game configuration', function () {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)
            const game = createMockGame(Date.now(), 3600)

            assert.isUndefined(gameState.gameSeed)
            gameState.setGame(game)
            assert.isDefined(gameState.gameSeed)
        })
    })

    suite('currentEpoch', function () {
        test('returns epoch from state', function () {
            const stateRow = createMockStateRow({epoch: 42})
            const gameState = GameState.from(stateRow)

            assert.equal(gameState.currentEpoch.toNumber(), 42)
        })
    })

    suite('epochSeed', function () {
        test('returns seed from state', function () {
            const seed = '1234'.repeat(16)
            const stateRow = createMockStateRow({seed})
            const gameState = GameState.from(stateRow)

            assert.isTrue(gameState.epochSeed.equals(Checksum256.from(seed)))
        })
    })

    suite('gameSeed', function () {
        test('returns undefined when no game set', function () {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            assert.isUndefined(gameState.gameSeed)
        })

        test('returns game config seed when game set', function () {
            const stateRow = createMockStateRow()
            const game = createMockGame(Date.now(), 3600)
            const gameState = GameState.from(stateRow, game)

            assert.isDefined(gameState.gameSeed)
            assert.isTrue(gameState.gameSeed!.equals(game.config.seed))
        })
    })

    suite('isEnabled', function () {
        test('returns true when enabled', function () {
            const stateRow = createMockStateRow({enabled: true})
            const gameState = GameState.from(stateRow)

            assert.isTrue(gameState.isEnabled)
        })

        test('returns false when disabled', function () {
            const stateRow = createMockStateRow({enabled: false})
            const gameState = GameState.from(stateRow)

            assert.isFalse(gameState.isEnabled)
        })
    })

    suite('shipCount', function () {
        test('returns number of ships', function () {
            const stateRow = createMockStateRow({ships: 42})
            const gameState = GameState.from(stateRow)

            assert.equal(gameState.shipCount, 42)
        })
    })

    suite('currentSalt', function () {
        test('returns salt value', function () {
            const stateRow = createMockStateRow({salt: 99999})
            const gameState = GameState.from(stateRow)

            assert.equal(gameState.currentSalt.toNumber(), 99999)
        })
    })

    suite('nextEpochCommit', function () {
        test('returns commit hash', function () {
            const commit = 'abcd'.repeat(16)
            const stateRow = createMockStateRow({commit})
            const gameState = GameState.from(stateRow)

            assert.isTrue(gameState.nextEpochCommit.equals(Checksum256.from(commit)))
        })
    })

    suite('calculatedCurrentEpoch', function () {
        test('returns undefined when no game set', function () {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            assert.isUndefined(gameState.calculatedCurrentEpoch)
        })

        test('calculates current epoch from game config', function () {
            const stateRow = createMockStateRow()
            const nowSec = Math.floor(Date.now() / 1000)
            const game = createMockGame((nowSec - 7200) * 1000, 3600)
            const gameState = GameState.from(stateRow, game)

            const calculated = gameState.calculatedCurrentEpoch
            assert.isDefined(calculated)
            assert.equal(calculated!.toNumber(), 3)
        })
    })

    suite('currentEpochInfo', function () {
        test('returns undefined when no game set', function () {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            assert.isUndefined(gameState.currentEpochInfo)
        })

        test('returns epoch info when game set', function () {
            const stateRow = createMockStateRow({epoch: 1})
            const now = Math.floor(Date.now() / 1000) * 1000
            const game = createMockGame(now, 3600)
            const gameState = GameState.from(stateRow, game)

            const info = gameState.currentEpochInfo
            assert.isDefined(info)
            assert.equal(info!.epoch.toNumber(), 1)
            assert.instanceOf(info!.start, Date)
            assert.instanceOf(info!.end, Date)
        })
    })

    suite('getEpochInfo', function () {
        test('returns undefined when no game set', function () {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            assert.isUndefined(gameState.getEpochInfo(UInt64.from(5)))
        })

        test('returns epoch info for given epoch', function () {
            const stateRow = createMockStateRow()
            const now = Math.floor(Date.now() / 1000) * 1000
            const game = createMockGame(now, 3600)
            const gameState = GameState.from(stateRow, game)

            const info = gameState.getEpochInfo(UInt64.from(3))
            assert.isDefined(info)
            assert.equal(info!.epoch.toNumber(), 3)
        })
    })

    suite('hasSystemAt', function () {
        test('returns false when no game set', function () {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            assert.isFalse(gameState.hasSystemAt(0, 0))
        })

        test('returns true for valid system coordinates', function () {
            const stateRow = createMockStateRow()
            const game = createMockGame(Date.now(), 3600)
            const gameState = GameState.from(stateRow, game)

            const result = gameState.hasSystemAt(0, 0)
            assert.isBoolean(result)
        })
    })

    suite('hasSystemAtCoords', function () {
        test('returns false when no game set', function () {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            const coords = ServerContract.Types.coordinates.from({x: 0, y: 0})
            assert.isFalse(gameState.hasSystemAtCoords(coords))
        })

        test('returns boolean for valid coordinates', function () {
            const stateRow = createMockStateRow()
            const game = createMockGame(Date.now(), 3600)
            const gameState = GameState.from(stateRow, game)

            const coords = ServerContract.Types.coordinates.from({x: 0, y: 0})
            const result = gameState.hasSystemAtCoords(coords)
            assert.isBoolean(result)
        })
    })

    suite('summary', function () {
        test('returns summary object', function () {
            const stateRow = createMockStateRow({
                enabled: true,
                epoch: 10,
                ships: 50,
            })
            const gameState = GameState.from(stateRow)

            const summary = gameState.summary
            assert.isObject(summary)
            assert.equal(summary.enabled, true)
            assert.equal(summary.epoch, '10')
            assert.equal(summary.ships, 50)
            assert.isBoolean(summary.hasSeed)
            assert.isBoolean(summary.hasCommit)
        })

        test('hasSeed is false for zero seed', function () {
            const stateRow = createMockStateRow({seed: '0'.repeat(64)})
            const gameState = GameState.from(stateRow)

            assert.isFalse(gameState.summary.hasSeed)
        })

        test('hasCommit is false for zero commit', function () {
            const stateRow = createMockStateRow({commit: '0'.repeat(64)})
            const gameState = GameState.from(stateRow)

            assert.isFalse(gameState.summary.hasCommit)
        })
    })
})
