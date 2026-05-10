import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/travel'
import {getLocalShipload} from '../../helpers/shipload'

test('travel includes recharge=true by default', async () => {
    const action = await buildAction(
        {shipId: 42n, x: 10n, y: 20n, recharge: true},
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('travel')
    expect((action.decoded.data as any).recharge).toBe(true)
})

test('travel respects --no-recharge', async () => {
    const action = await buildAction(
        {shipId: 42n, x: 10n, y: 20n, recharge: false},
        getLocalShipload()
    )
    expect((action.decoded.data as any).recharge).toBe(false)
})
