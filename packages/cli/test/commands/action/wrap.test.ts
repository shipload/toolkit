import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/wrap'
import {getLocalShipload} from '../../helpers/shipload'

test('wrap builds action', async () => {
    const action = await buildAction(
        {
            owner: 'alice',
            entityType: 'ship',
            entityId: 1n,
            itemId: 7n,
            stackId: 0n,
            quantity: 5n,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('wrap')
})

test('wrap accepts modules vector', async () => {
    const action = await buildAction(
        {
            owner: 'alice',
            entityType: 'ship',
            entityId: 1n,
            itemId: 27n,
            stackId: 888888888n,
            quantity: 1n,
            modules: [],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('wrap')
})
