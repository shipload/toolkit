import {expect, test} from 'bun:test'
import {buildActions} from './collect'

function stub() {
    const calls: string[] = []
    const shipload = {
        shares: {
            collect: async (player: string, at: {x: bigint; y: bigint}) => {
                calls.push(`collect ${player} ${at.x},${at.y}`)
                return []
            },
            collectAll: async (player: string) => {
                calls.push(`collectAll ${player}`)
                return []
            },
        },
    }
    return {shipload: shipload as never, calls}
}

test('collects one world when coordinates are given', async () => {
    const {shipload, calls} = stub()
    await buildActions({player: 'alice', location: {x: 3n, y: -4n}}, shipload)
    expect(calls).toEqual(['collect alice 3,-4'])
})

test('collects every world without coordinates', async () => {
    const {shipload, calls} = stub()
    await buildActions({player: 'alice'}, shipload)
    expect(calls).toEqual(['collectAll alice'])
})
