import {expect, test} from 'bun:test'
import {Chains} from '@wharfkit/common'
import {Shipload} from '../src'
import {ServerContract} from '../src/contracts'
import {ATOMICASSETS_ABI} from '../src/nft/atomicassets'
import {ITEM_PROSPECTOR_T2_PACKED} from '../src/data/item-ids'

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

test('launch builds an eon.shipload::launch action with launcher, catcher, and cargo', () => {
    const action = sl.actions.launch(10, 20, [cargo(101, 7)])
    expect(String(action.account)).toBe('eon.shipload')
    expect(String(action.name)).toBe('launch')
    const data = action.decodeData(ServerContract.abi)
    expect(String(data.launcher_id)).toBe('10')
    expect(String(data.catcher_id)).toBe('20')
    expect(data.items.length).toBe(1)
    expect(Number(data.items[0].item_id)).toBe(101)
    expect(Number(data.items[0].quantity)).toBe(7)
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

test('upgrade builds an eon.shipload action with the right fields', () => {
    const action = sl.actions.upgrade(1, 2, ITEM_PROSPECTOR_T2_PACKED, [], undefined)
    expect(String(action.account)).toBe('eon.shipload')
    expect(String(action.name)).toBe('upgrade')
    const data = action.decodeData(ServerContract.abi)
    expect(Number(data.builder_id)).toBe(1)
    expect(Number(data.target_id)).toBe(2)
    expect(Number(data.target_item_id)).toBe(ITEM_PROSPECTOR_T2_PACKED)
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

test('transit builds an eon.shipload::transit action with entrance and exit coords', () => {
    const action = sl.actions.transit(1, {x: 10, y: 20}, {x: 99999, y: -88888})
    expect(String(action.account)).toBe('eon.shipload')
    expect(String(action.name)).toBe('transit')
    const data = action.decodeData(ServerContract.abi)
    expect(String(data.id)).toBe('1')
    expect(Number(data.ax)).toBe(10)
    expect(Number(data.ay)).toBe(20)
    expect(Number(data.bx)).toBe(99999)
    expect(Number(data.by)).toBe(-88888)
})

test('grouptransit builds an eon.shipload::grouptransit action with entities and endpoints', () => {
    const action = sl.actions.grouptransit(
        [
            {entityType: 'ship', entityId: 1},
            {entityType: 'container', entityId: 2},
        ],
        {x: 10, y: 20},
        {x: 999000, y: 20}
    )
    expect(String(action.account)).toBe('eon.shipload')
    expect(String(action.name)).toBe('grouptransit')
    const data = action.decodeData(ServerContract.abi)
    expect(data.entities.length).toBe(2)
    expect(String(data.entities[0].entity_type)).toBe('ship')
    expect(String(data.entities[0].entity_id)).toBe('1')
    expect(String(data.entities[1].entity_type)).toBe('container')
    expect(Number(data.ax)).toBe(10)
    expect(Number(data.bx)).toBe(999000)
})

test('getwormhole builds an eon.shipload::getwormhole read-only action', () => {
    const action = sl.actions.getwormhole(10, 20)
    expect(String(action.account)).toBe('eon.shipload')
    expect(String(action.name)).toBe('getwormhole')
    const data = action.decodeData(ServerContract.abi)
    expect(Number(data.x)).toBe(10)
    expect(Number(data.y)).toBe(20)
})

test('gather without slot omits the slot field', () => {
    const action = sl.actions.gather(1, 2, 3, 20)
    expect(String(action.name)).toBe('gather')
    const data = action.decodeData(ServerContract.abi)
    expect(String(data.source_id)).toBe('1')
    expect(String(data.destination_id)).toBe('2')
    expect(Number(data.stratum)).toBe(3)
    expect(Number(data.quantity)).toBe(20)
    expect(data.slot).toBeNull()
})

test('gather with slot includes slot as the trailing param', () => {
    const action = sl.actions.gather(1, 2, 3, 20, 2)
    expect(String(action.name)).toBe('gather')
    const data = action.decodeData(ServerContract.abi)
    expect(Number(data.slot)).toBe(2)
})

test('gather with slot 0 includes the falsy lane index', () => {
    const action = sl.actions.gather(1, 2, 3, 20, 0)
    const data = action.decodeData(ServerContract.abi)
    expect(Number(data.slot)).toBe(0)
})

test('craft without slot omits slot', () => {
    const action = sl.actions.craft(1, 10001, 1, [cargo(10201, 1)])
    const data = action.decodeData(ServerContract.abi)
    expect(data.slot).toBeNull()
})

test('craft with slot includes slot after target', () => {
    const action = sl.actions.craft(1, 10001, 1, [cargo(10201, 1)], undefined, 0)
    const data = action.decodeData(ServerContract.abi)
    expect(data.target).toBeNull()
    expect(Number(data.slot)).toBe(0)
})

test('craft with both target and slot includes both', () => {
    const action = sl.actions.craft(1, 10001, 1, [cargo(10201, 1)], 7, 1)
    const data = action.decodeData(ServerContract.abi)
    expect(String(data.target)).toBe('7')
    expect(Number(data.slot)).toBe(1)
})

test('bundleGather packs N gather actions into one ordered Transaction', () => {
    const gathers = [
        {sourceId: 11, destinationId: 2, stratum: 3, quantity: 10, slot: 0},
        {sourceId: 22, destinationId: 2, stratum: 3, quantity: 10, slot: 1},
        {sourceId: 33, destinationId: 2, stratum: 3, quantity: 5},
    ]
    const tx = sl.actions.bundleGather(gathers)
    expect(tx.actions.length).toBe(3)
    expect(tx.actions.every((a) => String(a.name) === 'gather')).toBe(true)
    const d0 = tx.actions[0].decodeData(ServerContract.abi)
    const d1 = tx.actions[1].decodeData(ServerContract.abi)
    const d2 = tx.actions[2].decodeData(ServerContract.abi)
    // distinct source_id values anchor ordering — a reversed array would fail here
    expect(String(d0.source_id)).toBe('11')
    expect(String(d1.source_id)).toBe('22')
    expect(String(d2.source_id)).toBe('33')
    expect(Number(d0.slot)).toBe(0)
    expect(Number(d1.slot)).toBe(1)
    expect(d2.slot).toBeNull()
})

test('getLaunchQuote mirrors contract launch formulas for a deterministic route', () => {
    const start = new Date('2026-06-26T00:00:00.000Z')
    const quote = sl.actions.getLaunchQuote(
        {
            coordinates: {x: 0, y: 0},
            launcher: {charge_rate: 500, velocity: 250, drain: 20},
            generator: {capacity: 1000},
        },
        {coordinates: {x: 3, y: 4}},
        [cargo(101, 1000)],
        start
    )

    expect(quote.chargeTime).toBe(2000)
    expect(quote.flightTime).toBe(1)
    expect(quote.energyCost).toBe(100)
    expect(quote.arrival.toISOString()).toBe('2026-06-26T00:33:21.000Z')
    expect(quote.maxReach).toBe(509999n)
})

test('getLaunchQuote increases charge, flight, and energy with heavier and farther launches', () => {
    const launcher = {
        coordinates: {x: 0, y: 0},
        launcher: {charge_rate: 1000, velocity: 100, drain: 25},
        generator: {capacity: 2000},
    }

    const lightNear = sl.actions.getLaunchQuote(launcher, {coordinates: {x: 10, y: 0}}, [
        cargo(101, 1),
    ])
    const heavyNear = sl.actions.getLaunchQuote(launcher, {coordinates: {x: 10, y: 0}}, [
        cargo(101, 100),
    ])
    const heavyFar = sl.actions.getLaunchQuote(launcher, {coordinates: {x: 1000, y: 0}}, [
        cargo(101, 100),
    ])

    expect(heavyNear.chargeTime).toBeGreaterThan(lightNear.chargeTime)
    expect(heavyFar.flightTime).toBeGreaterThan(heavyNear.flightTime)
    expect(heavyFar.energyCost).toBeGreaterThan(heavyNear.energyCost)
})

test('getLaunchQuote clamps saturated energy to uint32 max', () => {
    const quote = sl.actions.getLaunchQuote(
        {
            coordinates: {x: 0, y: 0},
            launcher: {charge_rate: 1, velocity: 1, drain: 65535},
            generator: {capacity: 4294967295},
        },
        {coordinates: {x: 1_000_000_000_000, y: 0}},
        [cargo(101, 4_000_000)]
    )

    expect(quote.energyCost).toBe(4294967295)
    expect(quote.maxReach).toBe(18446744073709551615n)
})

test('getLaunchQuote mirrors uint32 payload mass wrapping at item and total boundaries', () => {
    const wrappedItem = {
        item_id: 101,
        stats: 0n,
        modules: [{type: 0, installed: {item_id: 10109, stats: 0n}}],
        quantity: 4_294_967,
    }

    const quote = sl.actions.getLaunchQuote(
        {
            coordinates: {x: 0, y: 0},
            launcher: {charge_rate: 1, velocity: 1, drain: 1},
            generator: {capacity: 1000},
        },
        {coordinates: {x: 1, y: 0}},
        [wrappedItem, cargo(101, 4_294_967)]
    )

    expect(quote.chargeTime).toBe(999408)
})

test('sendAsset builds an atomicassets::transfer to the recipient with the given memo', () => {
    const action = sl.actions.sendAsset('alice', 'bob', 7, 'gg')
    expect(String(action.account)).toBe('atomicassets')
    expect(String(action.name)).toBe('transfer')
    expect(String(action.authorization[0].actor)).toBe('alice')
    expect(String(action.authorization[0].permission)).toBe('active')
    const data = action.decodeData(ATOMICASSETS_ABI)
    expect(String(data.from)).toBe('alice')
    expect(String(data.to)).toBe('bob')
    expect(data.asset_ids.map(String)).toEqual(['7'])
    expect(String(data.memo)).toBe('gg')
})

test('sendAsset defaults to an empty memo', () => {
    const action = sl.actions.sendAsset('alice', 'bob', 7)
    const data = action.decodeData(ATOMICASSETS_ABI)
    expect(String(data.memo)).toBe('')
})
