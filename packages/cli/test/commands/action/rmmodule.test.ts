import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/rmmodule'
import {getLocalShipload} from '../../helpers/shipload'

test('rmmodule host-mode: target_ref defaults to null', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            moduleIndex: 0,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('rmmodule')
})

test('rmmodule packed-mode: target_ref present when target-* set', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            moduleIndex: 0,
            targetItemId: 27n,
            targetStats: 888888888n,
            targetModules: [],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('rmmodule')
})
