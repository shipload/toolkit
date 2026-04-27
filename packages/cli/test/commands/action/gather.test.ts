import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/gather'

test('gather builds action with source + dest refs', () => {
    const action = buildAction({
        source: {entityType: 'ship', entityId: 1n},
        destination: {entityType: 'warehouse', entityId: 0n},
        stratum: 3,
        quantity: 100,
    })
    expect(action.name.toString()).toBe('gather')
})
