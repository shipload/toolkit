import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/foundcompany'

test('foundcompany builds action with an empty name', async () => {
    const action = await buildAction({account: 'alice'})
    expect(action.name.toString()).toBe('foundcompany')
    expect((action.decoded.data as any).name).toBe('')
})
