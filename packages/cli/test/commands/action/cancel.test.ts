import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/cancel'

test('cancel builds action with explicit count', async () => {
    const action = await buildAction({entityType: 'ship', entityId: 42n, count: 3n})
    expect(action.name.toString()).toBe('cancel')
    const decoded = action.decoded
    expect((decoded.data as any).count.toString()).toBe('3')
})
