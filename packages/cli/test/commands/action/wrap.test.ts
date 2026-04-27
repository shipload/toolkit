import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/wrap'

test('wrap builds action', async () => {
    const action = await buildAction({
        owner: 'alice',
        entityType: 'ship',
        entityId: 1n,
        cargoId: 7n,
        quantity: 5n,
    })
    expect(action.name.toString()).toBe('wrap')
})
