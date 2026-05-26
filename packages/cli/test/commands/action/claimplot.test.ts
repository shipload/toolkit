import {ServerTypes} from '@shipload/sdk'
import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/claimplot'
import {getLocalShipload} from '../../helpers/shipload'

test('claimplot builds action with the right name', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            targetItemId: 11,
            x: 100n,
            y: 200n,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('claimplot')
})

test('claimplot encodes target_item_id, coords (z=0), and entity id', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 42n,
            targetItemId: 11,
            x: -7n,
            y: 9n,
        },
        getLocalShipload()
    )
    const decoded = action.decodeData(ServerTypes.claimplot)
    expect(decoded.id.toString()).toBe('42')
    expect(decoded.target_item_id.toString()).toBe('11')
    expect(decoded.coords.x.toString()).toBe('-7')
    expect(decoded.coords.y.toString()).toBe('9')
})
