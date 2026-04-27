import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/grouptravel'

test('grouptravel builds action with entity list', async () => {
    const action = await buildAction({
        entities: [
            {entityType: 'ship', entityId: 1n},
            {entityType: 'container', entityId: 2n},
        ],
        x: 10n,
        y: 20n,
        recharge: true,
    })
    expect(action.name.toString()).toBe('grouptravel')
    expect((action.decoded.data as any).entities).toHaveLength(2)
})
