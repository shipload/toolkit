import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/addmodule'

test('addmodule defaults target to 0', async () => {
    const action = await buildAction({
        entityType: 'ship',
        entityId: 1n,
        moduleIndex: 0,
        moduleCargoId: 5n,
        targetCargoId: 0n,
    })
    expect(action.name.toString()).toBe('addmodule')
})

test('addmodule respects explicit target', async () => {
    const action = await buildAction({
        entityType: 'ship',
        entityId: 1n,
        moduleIndex: 0,
        moduleCargoId: 5n,
        targetCargoId: 42n,
    })
    expect(action.name.toString()).toBe('addmodule')
})
