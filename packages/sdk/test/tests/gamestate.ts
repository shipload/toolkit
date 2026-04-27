import {describe, test} from 'bun:test'
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

describe('GameState', () => {
    describe('from', () => {
        test('creates GameState from state_row without game', () => {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            assert.instanceOf(gameState, GameState)
            assert.equal(gameState.epoch.toNumber(), 5)
        })

        test('creates GameState from state_row with game', () => {
            const stateRow = createMockStateRow()
            const game = createMockGame(Date.now(), 3600)
            const gameState = GameState.from(stateRow, game)

            assert.instanceOf(gameState, GameState)
            assert.isDefined(gameState.gameSeed)
        })
    })

    describe('setGame', () => {
        test('sets game configuration', () => {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)
            const game = createMockGame(Date.now(), 3600)

            assert.isUndefined(gameState.gameSeed)
            gameState.setGame(game)
            assert.isDefined(gameState.gameSeed)
        })
    })

    describe('currentEpoch', () => {
        test('returns epoch from state', () => {
            const stateRow = createMockStateRow({epoch: 42})
            const gameState = GameState.from(stateRow)

            assert.equal(gameState.currentEpoch.toNumber(), 42)
        })
    })

    describe('epochSeed', () => {
        test('returns seed from state', () => {
            const seed = '1234'.repeat(16)
            const stateRow = createMockStateRow({seed})
            const gameState = GameState.from(stateRow)

            assert.isTrue(gameState.epochSeed.equals(Checksum256.from(seed)))
        })
    })

    describe('gameSeed', () => {
        test('returns undefined when no game set', () => {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            assert.isUndefined(gameState.gameSeed)
        })

        test('returns game config seed when game set', () => {
            const stateRow = createMockStateRow()
            const game = createMockGame(Date.now(), 3600)
            const gameState = GameState.from(stateRow, game)

            assert.isDefined(gameState.gameSeed)
            assert.isTrue(gameState.gameSeed!.equals(game.config.seed))
        })
    })

    describe('isEnabled', () => {
        test('returns true when enabled', () => {
            const stateRow = createMockStateRow({enabled: true})
            const gameState = GameState.from(stateRow)

            assert.isTrue(gameState.isEnabled)
        })

        test('returns false when disabled', () => {
            const stateRow = createMockStateRow({enabled: false})
            const gameState = GameState.from(stateRow)

            assert.isFalse(gameState.isEnabled)
        })
    })

    describe('shipCount', () => {
        test('returns number of ships', () => {
            const stateRow = createMockStateRow({ships: 42})
            const gameState = GameState.from(stateRow)

            assert.equal(gameState.shipCount, 42)
        })
    })

    describe('currentSalt', () => {
        test('returns salt value', () => {
            const stateRow = createMockStateRow({salt: 99999})
            const gameState = GameState.from(stateRow)

            assert.equal(gameState.currentSalt.toNumber(), 99999)
        })
    })

    describe('nextEpochCommit', () => {
        test('returns commit hash', () => {
            const commit = 'abcd'.repeat(16)
            const stateRow = createMockStateRow({commit})
            const gameState = GameState.from(stateRow)

            assert.isTrue(gameState.nextEpochCommit.equals(Checksum256.from(commit)))
        })
    })

    describe('calculatedCurrentEpoch', () => {
        test('returns undefined when no game set', () => {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            assert.isUndefined(gameState.calculatedCurrentEpoch)
        })

        test('calculates current epoch from game config', () => {
            const stateRow = createMockStateRow()
            const nowSec = Math.floor(Date.now() / 1000)
            const game = createMockGame((nowSec - 7200) * 1000, 3600)
            const gameState = GameState.from(stateRow, game)

            const calculated = gameState.calculatedCurrentEpoch
            assert.isDefined(calculated)
            assert.equal(calculated!.toNumber(), 3)
        })
    })

    describe('currentEpochInfo', () => {
        test('returns undefined when no game set', () => {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            assert.isUndefined(gameState.currentEpochInfo)
        })

        test('returns epoch info when game set', () => {
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

    describe('getEpochInfo', () => {
        test('returns undefined when no game set', () => {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            assert.isUndefined(gameState.getEpochInfo(UInt64.from(5)))
        })

        test('returns epoch info for given epoch', () => {
            const stateRow = createMockStateRow()
            const now = Math.floor(Date.now() / 1000) * 1000
            const game = createMockGame(now, 3600)
            const gameState = GameState.from(stateRow, game)

            const info = gameState.getEpochInfo(UInt64.from(3))
            assert.isDefined(info)
            assert.equal(info!.epoch.toNumber(), 3)
        })
    })

    describe('hasSystemAt', () => {
        test('returns false when no game set', () => {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            assert.isFalse(gameState.hasSystemAt(0, 0))
        })

        test('returns true for valid system coordinates', () => {
            const stateRow = createMockStateRow()
            const game = createMockGame(Date.now(), 3600)
            const gameState = GameState.from(stateRow, game)

            const result = gameState.hasSystemAt(0, 0)
            assert.isBoolean(result)
        })
    })

    describe('hasSystemAtCoords', () => {
        test('returns false when no game set', () => {
            const stateRow = createMockStateRow()
            const gameState = GameState.from(stateRow)

            const coords = ServerContract.Types.coordinates.from({x: 0, y: 0})
            assert.isFalse(gameState.hasSystemAtCoords(coords))
        })

        test('returns boolean for valid coordinates', () => {
            const stateRow = createMockStateRow()
            const game = createMockGame(Date.now(), 3600)
            const gameState = GameState.from(stateRow, game)

            const coords = ServerContract.Types.coordinates.from({x: 0, y: 0})
            const result = gameState.hasSystemAtCoords(coords)
            assert.isBoolean(result)
        })
    })

    describe('summary', () => {
        test('returns summary object', () => {
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

        test('hasSeed is false for zero seed', () => {
            const stateRow = createMockStateRow({seed: '0'.repeat(64)})
            const gameState = GameState.from(stateRow)

            assert.isFalse(gameState.summary.hasSeed)
        })

        test('hasCommit is false for zero commit', () => {
            const stateRow = createMockStateRow({commit: '0'.repeat(64)})
            const gameState = GameState.from(stateRow)

            assert.isFalse(gameState.summary.hasCommit)
        })
    })
})
