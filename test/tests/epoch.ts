import {makeClient} from '@wharfkit/mock-data'
import {getCurrentEpoch, getEpochInfo, hash, hash512, PlatformContract, ServerContract} from '$lib'
import assert from 'assert'
import {TimePointSec} from '@wharfkit/antelope'

const client = makeClient('https://jungle4.greymass.com')
const platform = new PlatformContract.Contract({client})
const server = new ServerContract.Contract({client})

suite('epoch', function () {
    test('getCurrentEpoch', async function () {
        const game = await platform.table('games').get('shipload.gm')
        if (!game) {
            throw new Error('game not found')
        }
        const epoch = getCurrentEpoch(game)
        assert.equal(epoch.equals(4), true)

        const info = getEpochInfo(game, epoch)
        assert.deepEqual(info.start, new Date('2024-07-05T18:00:00.000Z'))
        assert.deepEqual(info.end, new Date('2024-07-06T18:00:00.000Z'))
    })
})
