import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/foundcompany'

test('foundcompany builds action with correct name', async () => {
    const action = await buildAction({account: 'alice', name: 'Acme'})
    expect(action.name.toString()).toBe('foundcompany')
    expect((action.decoded.data as any).name).toBe('Acme')
})
