import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/gather'
import {getLocalShipload} from '../../helpers/shipload'

test('gather builds action with source + dest refs', async () => {
    const action = await buildAction(
        {
            source: {entityType: 'ship', entityId: 1n},
            destination: {entityType: 'warehouse', entityId: 0n},
            stratum: 3,
            quantity: 100,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('gather')
})
