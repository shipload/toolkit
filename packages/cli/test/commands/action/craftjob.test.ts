import {expect, test} from 'bun:test'
import {buildAction, SUBCOMMAND} from '../../../src/commands/action/craftjob'
import {getLocalShipload} from '../../helpers/shipload'

test('craftjob builds action with ship, workshop and inputs, no socket', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1003n,
            workshopId: 1001n,
            recipeId: 10001,
            quantity: 1,
            inputs: [{itemId: 101, quantity: 10, stackId: 413333752n}],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('craftjob')
    expect(action.account.toString()).toBe('eon.shipload')
    const decoded = action.decodeData(getLocalShipload().server.abi) as Record<string, unknown>
    expect(Object.keys(decoded)).toEqual([
        'ship_id',
        'workshop_id',
        'recipe_id',
        'quantity',
        'inputs',
    ])
})

test('craftjob buildAction accepts multi-stack inputs', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            workshopId: 1001n,
            recipeId: 10003,
            quantity: 5,
            inputs: [
                {itemId: 301, quantity: 11, stackId: 1000n},
                {itemId: 301, quantity: 39, stackId: 2000n},
            ],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('craftjob')
})

test('craftjob SUBCOMMAND takes workshop, recipe, quantity and inputs', () => {
    const cmd = SUBCOMMAND.build({entityType: 'ship', entityId: 1n})
    expect(cmd.name()).toBe('craftjob')
    expect(cmd.registeredArguments.map((a) => a.name())).toEqual([
        'workshop-id',
        'recipe-id',
        'quantity',
        'input',
    ])
    const longs = cmd.options.map((o) => o.long)
    expect(longs).toContain('--wait')
    expect(longs).toContain('--track')
})
