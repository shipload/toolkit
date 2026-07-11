import {expect, test} from 'bun:test'
import {buildAction, SUBCOMMAND} from '../../../src/commands/action/gather'
import {getLocalShipload} from '../../helpers/shipload'

test('gather builds action with source + dest refs', async () => {
    const action = await buildAction(
        {
            source: {entityType: 'ship', entityId: 1n},
            destination: {entityType: 'warehouse', entityId: 0n},
            stratum: 3,
            quantity: 100,
            recharge: false,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('gatherplan')
})

test('gather SUBCOMMAND exposes --recharge and --auto-recharge', () => {
    const cmd = SUBCOMMAND.build({entityType: 'ship', entityId: 1n})
    const longs = cmd.options.map((o) => o.long)
    expect(longs).toContain('--recharge')
    expect(longs).toContain('--auto-recharge')
})
