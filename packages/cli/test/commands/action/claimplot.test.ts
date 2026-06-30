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
            hubId: 5n,
            gx: 2,
            gy: 0,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('claimplot')
})

test('claimplot encodes target_item_id, cluster slot, and entity id', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 42n,
            targetItemId: 11,
            hubId: 5n,
            gx: -1,
            gy: 0,
        },
        getLocalShipload()
    )
    const decoded = action.decodeData(ServerTypes.claimplot)
    expect(decoded.builder_id.toString()).toBe('42')
    expect(decoded.target_item_id.toString()).toBe('11')
    expect(decoded.slot.hub.toString()).toBe('5')
    expect(decoded.slot.gx.toString()).toBe('-1')
    expect(decoded.slot.gy.toString()).toBe('0')
})
