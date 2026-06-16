import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/load'
import {getLocalShipload} from '../../helpers/shipload'

test('load builds action with all args', async () => {
    const action = await buildAction(
        {
            entityId: 1n,
            otherId: 2n,
            itemId: 5n,
            stackId: 0n,
            quantity: 100n,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('load')
})

test('load accepts modules vector', async () => {
    const action = await buildAction(
        {
            entityId: 1n,
            otherId: 2n,
            itemId: 27n,
            stackId: 888888888n,
            quantity: 1n,
            modules: [],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('load')
})
