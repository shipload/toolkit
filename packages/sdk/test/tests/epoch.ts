import {describe, test, beforeEach} from 'bun:test'
import {assert} from 'chai'
import {TimePointSec, UInt32, UInt64} from '@wharfkit/antelope'
import {makeClient} from '@wharfkit/mock-data'
import {Chains} from '@wharfkit/common'
import Shipload, {getCurrentEpoch, getEpochInfo, PlatformContract} from '$lib'

const client = makeClient('https://jungle4.greymass.com')
const platformContractName = 'platform.gm'
const serverContractName = 'shipload.gm'

function createMockGame(
    startTimestamp: number,
    epochtime: number
): PlatformContract.Types.game_row {
    const startSeconds = Math.floor(startTimestamp / 1000)
    const endSeconds = startSeconds + 60 * 60 * 24 * 365
    return PlatformContract.Types.game_row.from({
        contract: 'shipload.gm',
        config: {
            start: TimePointSec.fromMilliseconds(startTimestamp),
            end: TimePointSec.fromMilliseconds(endSeconds * 1000),
            epochtime: UInt32.from(epochtime),
            seed: '0000000000000000000000000000000000000000000000000000000000000000',
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

describe('epoch', () => {
    describe('getCurrentEpoch', () => {
        test('returns epoch 1 at game start', () => {
            const now = Math.floor(Date.now() / 1000) * 1000
            const game = createMockGame(now, 3600)

            const epoch = getCurrentEpoch(game)
            assert.equal(epoch.toNumber(), 1)
        })

        test('returns epoch 2 after one epoch time', () => {
            const nowSec = Math.floor(Date.now() / 1000)
            const epochtime = 3600
            const startSec = nowSec - epochtime
            const game = createMockGame(startSec * 1000, epochtime)

            const epoch = getCurrentEpoch(game)
            assert.equal(epoch.toNumber(), 2)
        })

        test('returns correct epoch after multiple epochs', () => {
            const nowSec = Math.floor(Date.now() / 1000)
            const epochtime = 3600
            const startSec = nowSec - epochtime * 5
            const game = createMockGame(startSec * 1000, epochtime)

            const epoch = getCurrentEpoch(game)
            assert.equal(epoch.toNumber(), 6)
        })
    })

    describe('getEpochInfo', () => {
        test('returns correct start and end dates for epoch 1', () => {
            const startTimestamp = Math.floor(Date.now() / 1000) * 1000
            const epochtime = 3600
            const game = createMockGame(startTimestamp, epochtime)

            const info = getEpochInfo(game, UInt64.from(1))

            assert.equal(info.epoch.toNumber(), 1)
            assert.equal(info.start.getTime(), startTimestamp)
            assert.equal(info.end.getTime(), startTimestamp + epochtime * 1000)
        })

        test('returns correct start and end dates for epoch 2', () => {
            const startTimestamp = Math.floor(Date.now() / 1000) * 1000
            const epochtime = 3600
            const game = createMockGame(startTimestamp, epochtime)

            const info = getEpochInfo(game, UInt64.from(2))

            assert.equal(info.epoch.toNumber(), 2)
            assert.equal(info.start.getTime(), startTimestamp + epochtime * 1000)
            assert.equal(info.end.getTime(), startTimestamp + epochtime * 1000 * 2)
        })

        test('calculates correct duration', () => {
            const startTimestamp = Math.floor(Date.now() / 1000) * 1000
            const epochtime = 7200
            const game = createMockGame(startTimestamp, epochtime)

            const info = getEpochInfo(game, UInt64.from(1))
            const duration = info.end.getTime() - info.start.getTime()

            assert.equal(duration, epochtime * 1000)
        })
    })

    describe('EpochsManager', () => {
        let shipload: Shipload

        beforeEach(async () => {
            shipload = await Shipload.load(Chains.Jungle4, {
                client,
                platformContractName,
                serverContractName,
            })
        })

        test('getCurrentHeight returns a positive epoch', async () => {
            const height = await shipload.epochs.getCurrentHeight()
            assert.isTrue(height.gt(UInt64.from(0)))
        })

        test('getCurrent returns EpochInfo', async () => {
            const info = await shipload.epochs.getCurrent()
            assert.isDefined(info.epoch)
            assert.isDefined(info.start)
            assert.isDefined(info.end)
            assert.instanceOf(info.start, Date)
            assert.instanceOf(info.end, Date)
        })

        test('getByHeight returns EpochInfo for given height', async () => {
            const info = await shipload.epochs.getByHeight(1)
            assert.equal(info.epoch.toNumber(), 1)
            assert.instanceOf(info.start, Date)
            assert.instanceOf(info.end, Date)
        })

        test('getTimeRemaining returns non-negative number', async () => {
            const remaining = await shipload.epochs.getTimeRemaining()
            assert.isAtLeast(remaining, 0)
        })

        test('getProgress returns number between 0 and 1', async () => {
            const progress = await shipload.epochs.getProgress()
            assert.isAtLeast(progress, 0)
            assert.isAtMost(progress, 1)
        })

        test('fitsInCurrentEpoch returns boolean', async () => {
            const fitsShort = await shipload.epochs.fitsInCurrentEpoch(1000)
            const fitsLong = await shipload.epochs.fitsInCurrentEpoch(1000 * 60 * 60 * 24 * 365)
            assert.isBoolean(fitsShort)
            assert.isBoolean(fitsLong)
        })
    })
})
