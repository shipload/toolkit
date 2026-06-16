import {expect, test} from 'bun:test'
import {bundleWithIdleResolve} from '../../src/lib/resolve-prompt'
import {getLocalShipload} from '../helpers/shipload'

test('bundleWithIdleResolve returns just the action when autoResolve is off', async () => {
    const sl = getLocalShipload()
    const action = sl.actions.warp(1n, {x: 0n, y: 0n})
    const actions = await bundleWithIdleResolve(1n, action, false)
    expect(actions).toHaveLength(1)
    expect(actions[0]).toBe(action)
})
