import {describe, test} from 'bun:test'
import {makeClient} from '@wharfkit/mock-data'
import {hash, hash512, PlatformContract, ServerContract} from '$lib'
import assert from 'assert'

const client = makeClient('https://jungle4.greymass.com')
const platform = new PlatformContract.Contract({client})
const server = new ServerContract.Contract({client})

describe('hash', () => {
    test('sha256', async () => {
        const value = 'foo'
        const game = await platform.table('games').get('eon.shipload')
        if (!game) {
            throw new Error('game not found')
        }
        const result = await server.readonly('hash', {
            value,
        })
        assert.equal(String(result), String(hash(game.config.seed, value)))
    })
    test('sha512', async () => {
        const value = 'foo'
        const game = await platform.table('games').get('eon.shipload')
        if (!game) {
            throw new Error('game not found')
        }
        const result = await server.readonly('hash512', {
            value,
        })
        assert.equal(String(result), String(hash512(game.config.seed, value)))
    })
})
