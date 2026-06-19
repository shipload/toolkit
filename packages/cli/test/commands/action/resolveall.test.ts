import {ServerTypes} from '@shipload/sdk'
import {expect, test} from 'bun:test'
import {buildAction} from '../../../src/commands/action/resolveall'
import {getLocalShipload} from '../../helpers/shipload'

test('resolveall builds an eon.shipload::resolveall action', async () => {
    const action = await buildAction({owner: 'alice'}, getLocalShipload())
    expect(action.account.toString()).toBe('eon.shipload')
    expect(action.name.toString()).toBe('resolveall')
})

test('resolveall encodes the owner', async () => {
    const action = await buildAction({owner: 'alice'}, getLocalShipload())
    const decoded = action.decodeData(ServerTypes.resolveall)
    expect(decoded.owner.toString()).toBe('alice')
})
