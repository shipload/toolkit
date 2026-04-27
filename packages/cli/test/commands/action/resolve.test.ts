import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/resolve'

test('resolve builds action for ship', async () => {
    const action = await buildAction({entityType: 'ship', entityId: 42n})
    expect(action.name.toString()).toBe('resolve')
})
