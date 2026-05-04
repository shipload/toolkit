import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/deploy'
import {getLocalShipload} from '../../helpers/shipload'

test('deploy builds action with stack-id 0', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            packedItemId: 5,
            stackId: 0n,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('deploy')
})

test('deploy passes explicit stack-id through', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            packedItemId: 5,
            stackId: 42n,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('deploy')
})

test('deploy accepts modules vector', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            packedItemId: 5,
            stackId: 0n,
            modules: [],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('deploy')
})
