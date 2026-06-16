import {expect, test} from 'bun:test'
import {buildAction, SUBCOMMAND} from '../../../src/commands/action/craft'
import {getLocalShipload} from '../../helpers/shipload'

test('craft builds action with single input', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            recipeId: 7,
            quantity: 2,
            inputs: [{itemId: 5, quantity: 100, stackId: 0n}],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('craft')
})

test('craft buildAction passes recipe id in UInt16 range', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            recipeId: 65535,
            quantity: 1,
            inputs: [],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('craft')
})

test('craft buildAction accepts multi-stack inputs (same item, different stacks)', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            recipeId: 10003,
            quantity: 1,
            inputs: [
                {itemId: 301, quantity: 11, stackId: 1000n},
                {itemId: 301, quantity: 21, stackId: 2000n},
            ],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('craft')
})

test('craft SUBCOMMAND exposes --recharge and --auto-recharge', () => {
    const cmd = SUBCOMMAND.build({entityType: 'ship', entityId: 1n})
    const longs = cmd.options.map((o) => o.long)
    expect(longs).toContain('--recharge')
    expect(longs).toContain('--auto-recharge')
})

test('craft SUBCOMMAND exposes --target for cross-craft', () => {
    const cmd = SUBCOMMAND.build({entityType: 'ship', entityId: 1n})
    expect(cmd.options.map((o) => o.long)).toContain('--target')
})

test('craft buildAction with target builds a cross-craft action', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            recipeId: 10003,
            quantity: 1,
            inputs: [{itemId: 301, quantity: 32, stackId: 0n}],
            target: 2n,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('craft')
})
