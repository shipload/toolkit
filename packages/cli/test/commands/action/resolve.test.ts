import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/resolve'
import {getLocalShipload} from '../../helpers/shipload'

test('resolve builds action for ship', async () => {
    const action = await buildAction({entityType: 'ship', entityId: 42n}, getLocalShipload())
    expect(action.name.toString()).toBe('resolve')
})
