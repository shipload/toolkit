import {expect, test} from 'bun:test'
import {Command} from 'commander'
import {buildAction, register} from '../../../src/commands/action/grouptravel'

test('grouptravel builds action with entity list', async () => {
    const action = await buildAction({
        entities: [
            {entityType: 'ship', entityId: 1n},
            {entityType: 'container', entityId: 2n},
        ],
        x: 10n,
        y: 20n,
        recharge: true,
    })
    expect(action.name.toString()).toBe('grouptravel')
    expect((action.decoded.data as any).entities).toHaveLength(2)
})

test('grouptravel exposes --recharge and --auto-recharge', () => {
    const program = new Command()
    register(program)
    const sub = program.commands.find((c) => c.name() === 'grouptravel')
    expect(sub).toBeDefined()
    const longs = sub?.options.map((o) => o.long) ?? []
    expect(longs).toContain('--recharge')
    expect(longs).toContain('--auto-recharge')
})
