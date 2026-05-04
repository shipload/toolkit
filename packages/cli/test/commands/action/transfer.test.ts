import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/transfer'
import {getLocalShipload} from '../../helpers/shipload'

test('transfer builds action with all args', async () => {
    const action = await buildAction(
        {
            sourceType: 'ship',
            sourceId: 1n,
            destType: 'warehouse',
            destId: 2n,
            itemId: 5n,
            stackId: 0n,
            quantity: 100n,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('transfer')
})

test('transfer accepts modules vector', async () => {
    const action = await buildAction(
        {
            sourceType: 'ship',
            sourceId: 1n,
            destType: 'ship',
            destId: 2n,
            itemId: 27n,
            stackId: 888888888n,
            quantity: 1n,
            modules: [],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('transfer')
})
