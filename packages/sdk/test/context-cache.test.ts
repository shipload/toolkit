import {expect, test} from 'bun:test'
import {APIClient, Serializer} from '@wharfkit/antelope'
import {Chains} from '@wharfkit/common'
import {Shipload} from '../src'
import {PlatformContract, ServerContract} from '../src/contracts'

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

const STATE_ROW = ServerContract.Types.state_row.from({
    enabled: true,
    epoch: 3,
    seed: 'cafe'.repeat(16),
})

function encodedGame() {
    return Serializer.encode({object: GAME_ROW, abi: PlatformContract.abi, type: 'game_row'})
        .hexString
}

function encodedState() {
    return Serializer.encode({object: STATE_ROW, abi: ServerContract.abi, type: 'state_row'})
        .hexString
}

function gameAndStateClient() {
    const client = new APIClient({
        provider: {
            async call({params}) {
                const table = String((params as {table: unknown}).table)
                await new Promise((resolve) => setTimeout(resolve, 5))
                const row = table === 'state' ? encodedState() : encodedGame()
                return {
                    status: 200,
                    headers: {},
                    text: '',
                    json: {rows: [row], more: false, next_key: ''},
                }
            },
        },
    })
    return client
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

test('getState on a cold context awaits the game config before resolving', async () => {
    const client = gameAndStateClient()
    const sdk = new Shipload(Chains.Jungle4, {client})
    const state = await sdk.getState()
    expect(state.gameSeed).toBeDefined()
    expect(String(state.gameSeed)).toBe('beef'.repeat(16))
})
