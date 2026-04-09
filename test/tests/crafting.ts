import {assert} from 'chai'

import {
    encodeStats,
    decodeStats,
    decodeCraftedItemStats,
    blendStacks,
    computeComponentStats,
    blendComponentStacks,
    computeEntityStats,
    ITEM_HULL_PLATES,
    ITEM_CARGO_LINING,
    ITEM_CONTAINER_T1_PACKED,
    computeContainerCapabilities,
    calc_craft_duration,
    calc_craft_energy,
    computeInputMass,
    categoryItemMass,
} from '$lib'

suite('Crafting', function () {
    suite('Seed Encoding', function () {
        test('encodes and decodes single stat', function () {
            const encoded = encodeStats([450])
            const decoded = decodeStats(encoded, 1)
            assert.equal(decoded[0], 450)
        })

        test('encodes and decodes multiple stats', function () {
            const values = [450, 300, 720, 150]
            const encoded = encodeStats(values)
            const decoded = decodeStats(encoded, 4)
            assert.deepEqual(decoded, values)
        })

        test('clamps to 10-bit range', function () {
            const encoded = encodeStats([999, 1, 512])
            const decoded = decodeStats(encoded, 3)
            assert.equal(decoded[0], 999)
            assert.equal(decoded[1], 1)
            assert.equal(decoded[2], 512)
        })

        test('handles zero seed', function () {
            const decoded = decodeStats(0n, 2)
            assert.deepEqual(decoded, [0, 0])
        })
    })

    suite('Blending', function () {
        test('weighted average of single stat', function () {
            const result = blendStacks(
                [
                    {quantity: 30, stats: {strength: 450}},
                    {quantity: 10, stats: {strength: 720}},
                ],
                'strength'
            )
            assert.equal(result, 517)
        })

        test('single stack returns its value', function () {
            const result = blendStacks(
                [{quantity: 40, stats: {strength: 600}}],
                'strength'
            )
            assert.equal(result, 600)
        })

        test('returns 0 for empty stacks', function () {
            const result = blendStacks([], 'strength')
            assert.equal(result, 0)
        })
    })

    suite('Component Stats', function () {
        test('hull plates from metal stacks', function () {
            const stats = computeComponentStats(ITEM_HULL_PLATES, [
                {
                    category: 'metal',
                    stacks: [
                        {quantity: 30, stats: {strength: 450, tolerance: 200, density: 300}},
                        {quantity: 10, stats: {strength: 720, tolerance: 400, density: 150}},
                    ],
                },
            ])
            assert.equal(stats.length, 2)
            const str = stats.find((s) => s.key === 'strength')
            const den = stats.find((s) => s.key === 'density')
            assert.equal(str!.value, 517)
            assert.equal(den!.value, 262)
        })

        test('cargo lining from precious + organic', function () {
            const stats = computeComponentStats(ITEM_CARGO_LINING, [
                {
                    category: 'precious',
                    stacks: [{quantity: 10, stats: {conductivity: 500, ductility: 700, reflectivity: 300}}],
                },
                {
                    category: 'organic',
                    stacks: [{quantity: 20, stats: {plasticity: 400, insulation: 200, purity: 800}}],
                },
            ])
            assert.equal(stats.length, 2)
            const duc = stats.find((s) => s.key === 'ductility')
            const pur = stats.find((s) => s.key === 'purity')
            assert.equal(duc!.value, 700)
            assert.equal(pur!.value, 800)
        })
    })

    suite('Entity Stats', function () {
        test('container from component stacks', function () {
            const stats = computeEntityStats('container', {
                [ITEM_HULL_PLATES]: [
                    {quantity: 4, stats: {strength: 500, density: 300}},
                    {quantity: 2, stats: {strength: 400, density: 200}},
                ],
                [ITEM_CARGO_LINING]: [
                    {quantity: 2, stats: {ductility: 600, purity: 700}},
                ],
            })
            assert.equal(stats.length, 4)
            const str = stats.find((s) => s.key === 'strength')
            assert.equal(str!.value, 466)
        })
    })

    suite('Decode Crafted Item', function () {
        test('decode hull plates seed', function () {
            const seed = encodeStats([450, 300])
            const stats = decodeCraftedItemStats(ITEM_HULL_PLATES, seed)
            assert.equal(stats['strength'], 450)
            assert.equal(stats['density'], 300)
        })

        test('decode container packed seed', function () {
            const seed = encodeStats([500, 300, 600, 700])
            const stats = decodeCraftedItemStats(ITEM_CONTAINER_T1_PACKED, seed)
            assert.equal(stats['strength'], 500)
            assert.equal(stats['density'], 300)
            assert.equal(stats['ductility'], 600)
            assert.equal(stats['purity'], 700)
        })
    })

    suite('Container Capabilities', function () {
        test('all stats at 500 produces expected mid-range values', function () {
            const caps = computeContainerCapabilities({
                strength: 500,
                density: 500,
                ductility: 500,
                purity: 500,
            })
            assert.equal(caps.hullmass, 25000 + 75 * 500)
            assert.equal(caps.capacity, Math.floor(1000000 * Math.pow(10, 1500 / 2997)))
            assert.approximately(caps.capacity, 3162000, 50000)
        })

        test('minimum stats produce floor values', function () {
            const caps = computeContainerCapabilities({
                strength: 1,
                density: 1,
                ductility: 1,
                purity: 1,
            })
            assert.equal(caps.hullmass, 25075)
            assert.isAtLeast(caps.hullmass, 25000)
            assert.isAtMost(caps.hullmass, 26000)
            assert.isAtLeast(caps.capacity, 1000000)
            assert.isAtMost(caps.capacity, 1100000)
        })

        test('maximum stats produce ceiling values', function () {
            const caps = computeContainerCapabilities({
                strength: 999,
                density: 999,
                ductility: 999,
                purity: 999,
            })
            assert.equal(caps.hullmass, 25000 + 75 * 999)
            assert.isAtLeast(caps.hullmass, 99000)
            assert.isAtMost(caps.hullmass, 100000)
            assert.isAtLeast(caps.capacity, 9900000)
            assert.isAtMost(caps.capacity, 10100000)
        })

        test('hullmass range is 25k-100k', function () {
            const min = computeContainerCapabilities({density: 1, strength: 500, ductility: 500, purity: 500})
            const max = computeContainerCapabilities({density: 999, strength: 500, ductility: 500, purity: 500})
            assert.isAtLeast(min.hullmass, 25000)
            assert.isAtMost(max.hullmass, 100000)
        })

        test('capacity range is 1M-10M', function () {
            const min = computeContainerCapabilities({strength: 1, ductility: 1, purity: 1, density: 500})
            const max = computeContainerCapabilities({strength: 999, ductility: 999, purity: 999, density: 500})
            assert.isAtLeast(min.capacity, 1000000)
            assert.isAtMost(max.capacity, 10100000)
        })

        test('density is inverted - lower density means lighter hull', function () {
            const low = computeContainerCapabilities({density: 100, strength: 500, ductility: 500, purity: 500})
            const high = computeContainerCapabilities({density: 900, strength: 500, ductility: 500, purity: 500})
            assert.isBelow(low.hullmass, high.hullmass)
        })
    })

    suite('calc_craft_duration', function () {
        test('basic duration calculation', function () {
            const duration = calc_craft_duration(500, 450000, 1)
            assert.equal(duration.toNumber(), 900)
        })

        test('batch quantity multiplies input mass', function () {
            const single = calc_craft_duration(500, 450000, 1)
            const batch = calc_craft_duration(500, 450000, 8)
            assert.equal(batch.toNumber(), single.toNumber() * 8)
        })

        test('higher speed reduces duration', function () {
            const slow = calc_craft_duration(200, 450000, 1)
            const fast = calc_craft_duration(800, 450000, 1)
            assert.isAbove(slow.toNumber(), fast.toNumber())
        })

        test('minimum duration is 1', function () {
            const duration = calc_craft_duration(999, 1, 1)
            assert.isAtLeast(duration.toNumber(), 1)
        })
    })

    suite('computeInputMass', function () {
        test('component returns positive mass', function () {
            const mass = computeInputMass(ITEM_HULL_PLATES, 'component')
            assert.isAbove(mass, 0)
            assert.equal(mass, 15 * categoryItemMass['metal'])
        })

        test('module returns positive mass', function () {
            const mass = computeInputMass('engine-t1', 'module')
            assert.isAbove(mass, 0)
        })

        test('entity returns positive mass', function () {
            const mass = computeInputMass('container', 'entity')
            assert.isAbove(mass, 0)
        })

        test('unknown component returns 0', function () {
            const mass = computeInputMass(99999, 'component')
            assert.equal(mass, 0)
        })

        test('unknown module returns 0', function () {
            const mass = computeInputMass('nonexistent', 'module')
            assert.equal(mass, 0)
        })
    })

    suite('calc_craft_energy', function () {
        test('basic energy calculation', function () {
            const energy = calc_craft_energy(15, 900)
            assert.equal(energy.toNumber(), 1)
        })

        test('higher drain costs more energy', function () {
            const low = calc_craft_energy(5, 1000)
            const high = calc_craft_energy(30, 1000)
            assert.isAbove(high.toNumber(), low.toNumber())
        })

        test('zero duration costs zero energy', function () {
            const energy = calc_craft_energy(15, 0)
            assert.equal(energy.toNumber(), 0)
        })
    })
})
