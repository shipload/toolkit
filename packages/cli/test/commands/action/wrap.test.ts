import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/wrap'
import {getLocalShipload} from '../../helpers/shipload'

test('wrap builds action', async () => {
    const action = await buildAction(
        {
            owner: 'alice',
            entityId: 1n,
            nexusId: 3n,
            cargoId: 42n,
            quantity: 5n,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('wrap')
})
