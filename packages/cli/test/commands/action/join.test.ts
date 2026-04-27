import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/join'

test('join builds action for account', async () => {
    const action = await buildAction({account: 'alice'})
    expect(action.name.toString()).toBe('join')
    expect(action.data).toBeDefined()
})
