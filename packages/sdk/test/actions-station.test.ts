import {expect, test} from 'bun:test'
import {Chains} from '@wharfkit/common'
import {Shipload} from '../src'
import {ServerContract} from '../src/contracts'

const sl = new Shipload(Chains.Jungle4)

const ref = (itemId: number) =>
    ServerContract.Types.cargo_ref.from({item_id: itemId, stats: 0, modules: []})

test('deploy builds an eon.shipload::deploy action carrying a cluster slot', () => {
    const action = sl.actions.deploy(1, ref(10202), {hub: 5, gx: 2, gy: 0})
    expect(String(action.account)).toBe('eon.shipload')
    expect(String(action.name)).toBe('deploy')
    const data = action.decodeData(ServerContract.abi)
    expect(String(data.id)).toBe('1')
    expect(String(data.slot!.hub)).toBe('5')
    expect(Number(data.slot!.gx)).toBe(2)
    expect(Number(data.slot!.gy)).toBe(0)
})

test('deploy omits the slot when none is provided', () => {
    const action = sl.actions.deploy(1, ref(10202))
    const data = action.decodeData(ServerContract.abi)
    expect(data.slot).toBeNull()
})

test('claimplot builds with a cluster slot, including negative cell coords', () => {
    const action = sl.actions.claimplot(1, 10202, {hub: 5, gx: -1, gy: 0})
    expect(String(action.name)).toBe('claimplot')
    const data = action.decodeData(ServerContract.abi)
    expect(String(data.builder_id)).toBe('1')
    expect(Number(data.target_item_id)).toBe(10202)
    expect(String(data.slot.hub)).toBe('5')
    expect(Number(data.slot.gx)).toBe(-1)
    expect(Number(data.slot.gy)).toBe(0)
})

test('movetile builds with hub id and signed from/to coords', () => {
    const action = sl.actions.movetile(5, -2, 0, 1, -1)
    expect(String(action.name)).toBe('movetile')
    const data = action.decodeData(ServerContract.abi)
    expect(String(data.hub_id)).toBe('5')
    expect(Number(data.from_gx)).toBe(-2)
    expect(Number(data.from_gy)).toBe(0)
    expect(Number(data.to_gx)).toBe(1)
    expect(Number(data.to_gy)).toBe(-1)
})

test('swaptile builds with hub id and signed a/b coords', () => {
    const action = sl.actions.swaptile(5, -2, 0, 1, -1)
    expect(String(action.name)).toBe('swaptile')
    const data = action.decodeData(ServerContract.abi)
    expect(String(data.hub_id)).toBe('5')
    expect(Number(data.a_gx)).toBe(-2)
    expect(Number(data.a_gy)).toBe(0)
    expect(Number(data.b_gx)).toBe(1)
    expect(Number(data.b_gy)).toBe(-1)
})
