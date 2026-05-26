import {ServerTypes} from '@shipload/sdk'
import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/buildplot'
import {getLocalShipload} from '../../helpers/shipload'

test('buildplot builds action with the right name', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            plotId: 42n,
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('buildplot')
})

test('buildplot encodes entity id and plot id', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 7n,
            plotId: 123n,
        },
        getLocalShipload()
    )
    const decoded = action.decodeData(ServerTypes.buildplot)
    expect(decoded.id.toString()).toBe('7')
    expect(decoded.plot_id.toString()).toBe('123')
})
