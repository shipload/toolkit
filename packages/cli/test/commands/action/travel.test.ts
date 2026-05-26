import {expect, test} from 'bun:test'
import {buildAction, SUBCOMMAND} from '../../../src/commands/action/travel'
import {getLocalShipload} from '../../helpers/shipload'

test('travel includes recharge=true by default', async () => {
    const action = await buildAction(
        {shipId: 42n, x: 10n, y: 20n, recharge: true},
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('travel')
    expect((action.decoded.data as {recharge: boolean}).recharge).toBe(true)
})

test('travel respects --no-recharge', async () => {
    const action = await buildAction(
        {shipId: 42n, x: 10n, y: 20n, recharge: false},
        getLocalShipload()
    )
    expect((action.decoded.data as {recharge: boolean}).recharge).toBe(false)
})

test('travel SUBCOMMAND exposes --recharge and --auto-recharge', () => {
    const cmd = SUBCOMMAND.build({entityType: 'ship', entityId: 1n})
    const longs = cmd.options.map((o) => o.long)
    expect(longs).toContain('--recharge')
    expect(longs).toContain('--auto-recharge')
})
