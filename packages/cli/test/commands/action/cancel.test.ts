import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/cancel'
import {getLocalShipload} from '../../helpers/shipload'

test('cancel builds action with explicit count', async () => {
    const action = await buildAction(
        {entityType: 'ship', entityId: 42n, count: 3n},
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('cancel')
    const decoded = action.decoded
    expect((decoded.data as any).count.toString()).toBe('3')
})
