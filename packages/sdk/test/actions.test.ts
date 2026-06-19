import {expect, test} from 'bun:test'
import {Chains} from '@wharfkit/common'
import {Shipload} from '../src'
import {ServerContract} from '../src/contracts'
import {ATOMICASSETS_ABI} from '../src/nft/atomicassets'

const sl = new Shipload(Chains.Jungle4)

const cargo = (itemId: number, quantity: number) =>
    ServerContract.Types.cargo_item.from({
        item_id: itemId,
        stats: 0,
        modules: [],
        quantity,
    })

test('load builds an eon.shipload::load action that pulls items from a giver', () => {
    const action = sl.actions.load(1, 2, [cargo(10201, 3)])
    expect(String(action.account)).toBe('eon.shipload')
    expect(String(action.name)).toBe('load')
    const data = action.decodeData(ServerContract.abi)
    expect(String(data.id)).toBe('1')
    expect(String(data.from_id)).toBe('2')
    expect(data.items.length).toBe(1)
    expect(Number(data.items[0].item_id)).toBe(10201)
    expect(Number(data.items[0].quantity)).toBe(3)
})

test('unload builds an eon.shipload::unload action that pushes items to a target', () => {
    const action = sl.actions.unload(1, 2, [cargo(10201, 3)])
    expect(String(action.account)).toBe('eon.shipload')
    expect(String(action.name)).toBe('unload')
    const data = action.decodeData(ServerContract.abi)
    expect(String(data.id)).toBe('1')
    expect(String(data.to_id)).toBe('2')
    expect(data.items.length).toBe(1)
    expect(Number(data.items[0].item_id)).toBe(10201)
    expect(Number(data.items[0].quantity)).toBe(3)
})

test('craft without a target self-crafts and omits the target field', () => {
    const action = sl.actions.craft(1, 10001, 1, [cargo(10201, 1)])
    expect(String(action.account)).toBe('eon.shipload')
    expect(String(action.name)).toBe('craft')
    const data = action.decodeData(ServerContract.abi)
    expect(String(data.id)).toBe('1')
    expect(Number(data.recipe_id)).toBe(10001)
    expect(data.target).toBeNull()
})

test('craft with a target cross-crafts onto the target entity', () => {
    const action = sl.actions.craft(1, 10001, 1, [cargo(10201, 1)], 7)
    expect(String(action.name)).toBe('craft')
    const data = action.decodeData(ServerContract.abi)
    expect(String(data.target)).toBe('7')
})

test('setLastPayer builds an atomicassets::setlastpayer action authed by the owner', () => {
    const action = sl.actions.setLastPayer('alice', 'shipload')
    expect(String(action.account)).toBe('atomicassets')
    expect(String(action.name)).toBe('setlastpayer')
    expect(String(action.authorization[0].actor)).toBe('alice')
    expect(String(action.authorization[0].permission)).toBe('active')
    const data = action.decodeData(ATOMICASSETS_ABI)
    expect(String(data.owner)).toBe('alice')
    expect(String(data.collection_name)).toBe('shipload')
})

test('setRamPayer builds an atomicassets::setrampayer action authed by the new payer', () => {
    const action = sl.actions.setRamPayer('alice', 1)
    expect(String(action.account)).toBe('atomicassets')
    expect(String(action.name)).toBe('setrampayer')
    expect(String(action.authorization[0].actor)).toBe('alice')
    const data = action.decodeData(ATOMICASSETS_ABI)
    expect(String(data.new_payer)).toBe('alice')
    expect(String(data.asset_id)).toBe('1')
})

test('transferForUnwrap builds an atomicassets::transfer action with the unwrap memo', () => {
    const action = sl.actions.transferForUnwrap('alice', 1)
    expect(String(action.account)).toBe('atomicassets')
    expect(String(action.name)).toBe('transfer')
    expect(String(action.authorization[0].actor)).toBe('alice')
    const data = action.decodeData(ATOMICASSETS_ABI)
    expect(String(data.from)).toBe('alice')
    expect(String(data.memo)).toBe('unwrap')
    expect(data.asset_ids.map(String)).toEqual(['1'])
})

test('wrap bundles setlastpayer when claimRam is set', async () => {
    const actions = await sl.actions.wrap('alice', 1, 2, 3, 4, {claimRam: true})
    expect(actions.length).toBe(2)
    expect(String(actions[0].name)).toBe('wrapcargo')
    expect(String(actions[1].account)).toBe('atomicassets')
    expect(String(actions[1].name)).toBe('setlastpayer')
    expect(String(actions[1].authorization[0].actor)).toBe('alice')
})

test('wrap omits setlastpayer by default', async () => {
    const actions = await sl.actions.wrap('alice', 1, 2, 3, 4)
    expect(actions.length).toBe(1)
    expect(String(actions[0].name)).toBe('wrapcargo')
})

test('wrapEntity bundles setlastpayer when claimRam is set', async () => {
    const actions = await sl.actions.wrapEntity('alice', 1, 2, {claimRam: true})
    expect(actions.length).toBe(2)
    expect(String(actions[0].name)).toBe('wrapentity')
    expect(String(actions[1].name)).toBe('setlastpayer')
})

test('wrapEntity omits setlastpayer by default', async () => {
    const actions = await sl.actions.wrapEntity('alice', 1, 2)
    expect(actions.length).toBe(1)
})

test('setLastPayer targets the configured atomicAssets account when overridden', () => {
    const custom = new Shipload(Chains.Jungle4, {atomicAssetsAccount: 'atomic.gm'})
    const action = custom.actions.setLastPayer('alice', 'shipload')
    expect(String(action.account)).toBe('atomic.gm')
})

test('setLastPayer defaults to the atomicassets account', () => {
    const action = sl.actions.setLastPayer('alice', 'shipload')
    expect(String(action.account)).toBe('atomicassets')
})

test('wrap bundling targets the configured atomicAssets account when overridden', async () => {
    const custom = new Shipload(Chains.Jungle4, {atomicAssetsAccount: 'atomic.gm'})
    const actions = await custom.actions.wrap('alice', 1, 2, 3, 4, {claimRam: true})
    expect(String(actions[1].account)).toBe('atomic.gm')
})

test('wrap bundles setlastpayer by default when the atomicAssets account is custom', async () => {
    const custom = new Shipload(Chains.Jungle4, {atomicAssetsAccount: 'atomic.gm'})
    const actions = await custom.actions.wrap('alice', 1, 2, 3, 4)
    expect(actions.length).toBe(2)
    expect(String(actions[1].name)).toBe('setlastpayer')
})

test('wrap omits setlastpayer when claimRam is explicitly false even on a custom account', async () => {
    const custom = new Shipload(Chains.Jungle4, {atomicAssetsAccount: 'atomic.gm'})
    const actions = await custom.actions.wrap('alice', 1, 2, 3, 4, {claimRam: false})
    expect(actions.length).toBe(1)
})

test('wrapEntity bundles setlastpayer by default when the atomicAssets account is custom', async () => {
    const custom = new Shipload(Chains.Jungle4, {atomicAssetsAccount: 'atomic.gm'})
    const actions = await custom.actions.wrapEntity('alice', 1, 2)
    expect(actions.length).toBe(2)
    expect(String(actions[1].name)).toBe('setlastpayer')
})

test('resolveall builds an eon.shipload::resolveall action for the owner', () => {
    const action = sl.actions.resolveall('alice')
    expect(String(action.account)).toBe('eon.shipload')
    expect(String(action.name)).toBe('resolveall')
    const data = action.decodeData(ServerContract.abi)
    expect(String(data.owner)).toBe('alice')
})
