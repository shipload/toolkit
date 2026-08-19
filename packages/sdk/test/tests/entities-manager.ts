import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {Name} from '@wharfkit/antelope'
import {EntitiesManager} from '$lib'
import type {GameContext} from 'src/managers/context'

const DEPOT_VIEW = {
    player_cap: 500000,
    stored_mass: 120000,
    reserved_mass: 20000,
    rows: [
        {
            id: 9,
            owner: 'alice',
            item_id: 101,
            quantity: 12,
            stats: 0,
            modules: [],
            sequence_id: null,
        },
    ],
}

function buildManager(calls: {action: string; params: unknown}[]): EntitiesManager {
    const stubContext = {
        server: {
            readonly: async (action: string, params: unknown) => {
                calls.push({action, params})
                if (action !== 'getdepot') {
                    throw new Error(`unexpected readonly call: ${action}`)
                }
                return DEPOT_VIEW
            },
        },
    } as unknown as GameContext
    return new EntitiesManager(stubContext)
}

describe('EntitiesManager.getDepot', () => {
    test('calls getdepot with the depot id and resolved owner', async () => {
        const calls: {action: string; params: any}[] = []
        const result = await buildManager(calls).getDepot(77, 'alice')

        assert.equal(calls.length, 1)
        assert.equal(calls[0].action, 'getdepot')
        assert.equal(calls[0].params.depot_id, 77)
        assert.isTrue(Name.from('alice').equals(calls[0].params.owner))
        assert.equal(Number(result.player_cap), 500000)
        assert.equal(Number(result.stored_mass), 120000)
        assert.equal(Number(result.reserved_mass), 20000)
        assert.equal(result.rows.length, 1)
        assert.equal(Number(result.rows[0].item_id), 101)
    })

    test('resolves the owner from a player row', async () => {
        const calls: {action: string; params: any}[] = []
        const playerRow = {owner: Name.from('bob')} as any
        await buildManager(calls).getDepot(77, playerRow)

        assert.isTrue(Name.from('bob').equals(calls[0].params.owner))
    })
})
