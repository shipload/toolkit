import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/craft'

test('craft builds action with single input', async () => {
    const action = await buildAction({
        entityType: 'ship',
        entityId: 1n,
        recipeId: 7,
        quantity: 2,
        inputs: [{itemId: 5, quantity: 100, stackId: 0n}],
    })
    expect(action.name.toString()).toBe('craft')
})

test('craft buildAction passes recipe id in UInt16 range', async () => {
    const action = await buildAction({
        entityType: 'ship',
        entityId: 1n,
        recipeId: 65535,
        quantity: 1,
        inputs: [],
    })
    expect(action.name.toString()).toBe('craft')
})

test('craft buildAction accepts multi-stack inputs (same item, different stacks)', async () => {
    const action = await buildAction({
        entityType: 'ship',
        entityId: 1n,
        recipeId: 10003,
        quantity: 1,
        inputs: [
            {itemId: 301, quantity: 11, stackId: 1000n},
            {itemId: 301, quantity: 21, stackId: 2000n},
        ],
    })
    expect(action.name.toString()).toBe('craft')
})
