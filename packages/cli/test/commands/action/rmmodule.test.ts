import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/rmmodule'

test('rmmodule defaults target to 0', async () => {
    const action = await buildAction({
        entityType: 'ship',
        entityId: 1n,
        moduleIndex: 0,
        targetCargoId: 0n,
    })
    expect(action.name.toString()).toBe('rmmodule')
})

test('rmmodule respects explicit target', async () => {
    const action = await buildAction({
        entityType: 'ship',
        entityId: 1n,
        moduleIndex: 0,
        targetCargoId: 42n,
    })
    expect(action.name.toString()).toBe('rmmodule')
})
