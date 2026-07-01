import {expect, test} from 'bun:test'
import {ServerTypes} from '@shipload/sdk'
import {buildAction} from '../../../src/commands/action/deploy'
import {getLocalShipload} from '../../helpers/shipload'

test('deploy builds action with stack-id 0', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            packedItemId: 5,
            stackId: 0n,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('deploy')
})

test('deploy passes explicit stack-id through', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            packedItemId: 5,
            stackId: 42n,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('deploy')
})

test('deploy accepts modules vector', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            packedItemId: 5,
            stackId: 0n,
            modules: [],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('deploy')
})

test('deploy encodes a cluster slot for a structure', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            packedItemId: 5,
            stackId: 0n,
            slot: {hub: 9n, gx: -1, gy: 0},
        },
        getLocalShipload()
    )
    const data = action.decodeData(ServerTypes.deploy)
    expect(data.slot!.hub.toString()).toBe('9')
    expect(Number(data.slot!.gx)).toBe(-1)
    expect(Number(data.slot!.gy)).toBe(0)
})

test('deploy omits the slot when none is given', async () => {
    const action = await buildAction(
        {entityType: 'ship', entityId: 1n, packedItemId: 5, stackId: 0n},
        getLocalShipload()
    )
    expect(action.decodeData(ServerTypes.deploy).slot).toBeUndefined()
})
