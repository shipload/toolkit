import {expect, test} from 'bun:test'
import {buildAction, DESCRIPTION} from '../../../src/commands/action/foundcompany'

test('foundcompany builds action with an empty name', async () => {
    const action = await buildAction({account: 'alice'})
    expect(action.name.toString()).toBe('foundcompany')
    expect((action.decoded.data as any).name).toBe('')
})

test('foundcompany describes the action without claiming it happened', () => {
    expect(DESCRIPTION).toBe('Founding company')
})
