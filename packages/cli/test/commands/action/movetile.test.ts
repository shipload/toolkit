import {expect, test} from 'bun:test'
import {ServerTypes} from '@shipload/sdk'
import {buildAction} from '../../../src/commands/action/movetile'
import {getLocalShipload} from '../../helpers/shipload'

test('movetile builds an eon.shipload::movetile action with hub id and signed coords', async () => {
    const action = await buildAction(
        {entityType: 'hub', entityId: 5n, fromGx: -2, fromGy: 0, toGx: 1, toGy: -1},
        getLocalShipload()
    )
    expect(action.account.toString()).toBe('eon.shipload')
    expect(action.name.toString()).toBe('movetile')
    const data = action.decodeData(ServerTypes.movetile)
    expect(data.hub_id.toString()).toBe('5')
    expect(Number(data.from_gx)).toBe(-2)
    expect(Number(data.from_gy)).toBe(0)
    expect(Number(data.to_gx)).toBe(1)
    expect(Number(data.to_gy)).toBe(-1)
})
