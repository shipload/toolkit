import {expect, test} from 'bun:test'
import {APIClient, Serializer} from '@wharfkit/antelope'
import {Chains} from '@wharfkit/common'
import {Shipload} from '../src'
import {PlatformContract} from '../src/contracts'

const GAME_ROW = PlatformContract.Types.game_row.from({
    contract: 'nex.shipload',
    config: {
        seed: 'beef'.repeat(16),
        epochtime: 3600,
        start: '2024-01-01T00:00:00.000',
        end: '2025-01-01T00:00:00.000',
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

function encodedGame() {
    return Serializer.encode({object: GAME_ROW, abi: PlatformContract.abi, type: 'game_row'})
        .hexString
}

function slowClient() {
    let calls = 0
    const client = new APIClient({
        provider: {
            async call() {
                calls += 1
                await new Promise((resolve) => setTimeout(resolve, 5))
                return {
                    status: 200,
                    headers: {},
                    text: '',
                    json: {rows: [encodedGame()], more: false, next_key: ''},
                }
            },
        },
    })
    return {client, calls: () => calls}
}

test('concurrent getGame callers share one request', async () => {
    const {client, calls} = slowClient()
    const sdk = new Shipload(Chains.Jungle4, {client})
    await Promise.all([sdk.getGame(), sdk.getGame(), sdk.getGame()])
    expect(calls()).toBe(1)
})

test('a failed getGame does not poison the cache', async () => {
    let attempt = 0
    const client = new APIClient({
        provider: {
            async call() {
                attempt += 1
                if (attempt === 1) throw new Error('network down')
                return {
                    status: 200,
                    headers: {},
                    text: '',
                    json: {rows: [encodedGame()], more: false, next_key: ''},
                }
            },
        },
    })
    const sdk = new Shipload(Chains.Jungle4, {client})
    await expect(sdk.getGame()).rejects.toThrow()
    await expect(sdk.getGame()).resolves.toBeDefined()
    expect(attempt).toBe(2)
})
