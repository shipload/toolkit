import {assert} from 'chai'
import {UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {
    encodeStats,
    ITEM_CRAFTER_T1,
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_HAULER_T1,
    ITEM_LOADER_T1,
    ITEM_STORAGE_T1,
    makeContainer,
    makeShip,
    makeWarehouse,
    ServerContract,
} from '$lib'

suite('makeShip factory', function () {
    test('stacks two hauler modules by capacity-weighted efficiency', function () {
        // Hauler decoded keys: composition, conductivity, fineness, resonance.
        // Capacity uses resonance, efficiency uses conductivity, drain uses
        // reflectivity — which the recipe doesn't carry, so it defaults to 500.
        const seedA = encodeStats([500, 500, 500, 500]) // cap=2, eff=5000, drain=9
        const seedB = encodeStats([999, 999, 999, 999]) // cap=3, eff=7994, drain=9
        const ship = makeShip({
            id: UInt64.from(1),
            owner: 'test',
            name: 'Twin Hauler',
            coordinates: {x: 0, y: 0},
            hullmass: 100000,
            capacity: 500000,
            energy: 350,
            modules: [
                {itemId: ITEM_HAULER_T1, stats: seedA},
                {itemId: ITEM_HAULER_T1, stats: seedB},
            ],
        })

        assert.exists(ship.hauler)
        assert.equal(Number(ship.hauler!.capacity.value.toString()), 5) // 2 + 3
        assert.equal(Number(ship.hauler!.drain.value.toString()), 18) // 9 + 9
        // capacity-weighted efficiency: (5000*2 + 7994*3) / 5 = 33982/5 = 6796.4 → floor 6796
        assert.equal(Number(ship.hauler!.efficiency.value.toString()), 6796)
    })

    test('four storage modules stack capacity bonuses additively', function () {
        const baseCapacity = 1_000_000
        const stats1 = encodeStats([100, 100, 100, 100])
        const stats2 = encodeStats([500, 500, 500, 500])
        const stats3 = encodeStats([700, 700, 700, 700])
        const stats4 = encodeStats([999, 999, 999, 999])

        const ship = makeShip({
            id: UInt64.from(1),
            owner: 'test',
            name: 'Storage Ship',
            coordinates: {x: 0, y: 0},
            hullmass: 100000,
            capacity: baseCapacity,
            energy: 100,
            modules: [
                {itemId: ITEM_STORAGE_T1, stats: stats1},
                {itemId: ITEM_STORAGE_T1, stats: stats2},
                {itemId: ITEM_STORAGE_T1, stats: stats3},
                {itemId: ITEM_STORAGE_T1, stats: stats4},
            ],
        })

        // uses strength + hardness + saturation (all encoded at indices 0, 2, 3).
        // stats1: strength=100, hardness=100, saturation=100 → sum  300 → pct 11 → 110_000
        // stats2: strength=500, hardness=500, saturation=500 → sum 1500 → pct 15 → 150_000
        // stats3: strength=700, hardness=700, saturation=700 → sum 2100 → pct 17 → 170_000
        // stats4: strength=999, hardness=999, saturation=999 → sum 2997 → pct 20 → 200_000
        // total = 1_000_000 + 110_000 + 150_000 + 170_000 + 200_000 = 1_630_000
        assert.equal(Number(ship.capacity!.value.toString()), 1_630_000)
    })

    test('rejects module with no compatible slot on the entity', function () {
        const engineSeed = encodeStats([500, 500, 500, 500])
        assert.throws(
            () =>
                makeShip({
                    id: UInt64.from(1),
                    owner: 'test',
                    name: 'Overloaded',
                    coordinates: {x: 0, y: 0},
                    hullmass: 100000,
                    capacity: 500000,
                    energy: 100,
                    modules: [
                        {itemId: ITEM_ENGINE_T1, stats: engineSeed},
                        {itemId: ITEM_ENGINE_T1, stats: engineSeed},
                        {itemId: ITEM_ENGINE_T1, stats: engineSeed},
                        {itemId: ITEM_ENGINE_T1, stats: engineSeed},
                        {itemId: ITEM_ENGINE_T1, stats: engineSeed},
                        {itemId: ITEM_ENGINE_T1, stats: engineSeed},
                    ],
                }),
            /No compatible slot/
        )
    })

    test('empty modules array produces ship with no derived capabilities', function () {
        const ship = makeShip({
            id: UInt64.from(1),
            owner: 'test',
            name: 'Bare Hull',
            coordinates: {x: 0, y: 0},
            hullmass: 100000,
            capacity: 500000,
            energy: 0,
            modules: [],
        })
        assert.isUndefined(ship.engines)
        assert.isUndefined(ship.generator)
        assert.isUndefined(ship.gatherer)
        assert.isUndefined(ship.hauler)
        assert.isUndefined(ship.loaders)
        assert.isUndefined(ship.crafter)
        assert.equal(Number(ship.capacity!.value.toString()), 500000)
        assert.lengthOf(ship.modules, 5) // Ship T1 has 5 slots, all empty
    })

    test('exposes full capability kit when modules cover engines, generator, loader, and gatherer', function () {
        const seed = encodeStats([500, 500, 500, 500])
        const ship = makeShip({
            id: UInt64.from(1),
            owner: 'test',
            name: 'Full Kit',
            coordinates: {x: 0, y: 0},
            hullmass: 100000,
            capacity: 500000,
            energy: 350,
            modules: [
                {itemId: ITEM_ENGINE_T1, stats: seed},
                {itemId: ITEM_GENERATOR_T1, stats: seed},
                {itemId: ITEM_LOADER_T1, stats: seed},
                {itemId: ITEM_GATHERER_T1, stats: seed},
            ],
        })
        assert.exists(ship.engines)
        assert.exists(ship.generator)
        assert.exists(ship.loaders)
        assert.exists(ship.gatherer)
    })
})

suite('makeWarehouse factory', function () {
    test('builds warehouse with loader + 4 storage modules', function () {
        const loaderSeed = encodeStats([500, 500, 500, 500])
        const storageSeed = encodeStats([500, 500, 500, 500])
        const wh = makeWarehouse({
            id: UInt64.from(1),
            owner: 'test',
            name: 'Full Warehouse',
            coordinates: {x: 0, y: 0},
            hullmass: 500000,
            capacity: 10_000_000,
            modules: [
                {itemId: ITEM_LOADER_T1, stats: loaderSeed},
                {itemId: ITEM_STORAGE_T1, stats: storageSeed},
                {itemId: ITEM_STORAGE_T1, stats: storageSeed},
                {itemId: ITEM_STORAGE_T1, stats: storageSeed},
                {itemId: ITEM_STORAGE_T1, stats: storageSeed},
            ],
        })
        assert.exists(wh.loaders)
        assert.isAbove(Number(wh.capacity!.value.toString()), 10_000_000)
        assert.lengthOf(wh.modules, 5)
    })

    test('rejects crafter module — warehouse has no crafter slot', function () {
        const crafterSeed = encodeStats([500, 500, 500, 500])
        assert.throws(
            () =>
                makeWarehouse({
                    id: UInt64.from(1),
                    owner: 'test',
                    name: 'Invalid',
                    coordinates: {x: 0, y: 0},
                    hullmass: 500000,
                    capacity: 10_000_000,
                    modules: [{itemId: ITEM_CRAFTER_T1, stats: crafterSeed}],
                }),
            /No compatible slot.*Warehouse/
        )
    })
})

suite('makeContainer factory', function () {
    test('cargo input is threaded through (previously hardcoded to empty)', function () {
        const container = makeContainer({
            id: UInt64.from(1),
            owner: 'test',
            name: 'Full Container',
            coordinates: {x: 0, y: 0},
            hullmass: 50000,
            capacity: 1_000_000,
            cargo: [
                ServerContract.Types.cargo_item.from({
                    item_id: UInt16.from(100),
                    quantity: UInt32.from(42),
                    stats: UInt64.from(0),
                    modules: [],
                }),
            ],
        })
        assert.lengthOf(container.cargo, 1)
        assert.equal(Number(container.cargo[0].quantity.value.toString()), 42)
    })
})
