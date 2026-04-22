import {assert} from 'chai'
import {UInt64} from '@wharfkit/antelope'

import {
    blendCargoStacks,
    blendCrossGroup,
    blendStacks,
    calc_craft_duration,
    calc_craft_energy,
    categoryItemMass,
    computeComponentStats,
    computeContainerCapabilities,
    computeContainerT2Capabilities,
    computeCraftedOutputStats,
    computeEntityStats,
    computeInputMass,
    decodeCraftedItemStats,
    decodeStat,
    decodeStats,
    deriveResourceStats,
    encodeGatheredCargoStats,
    encodeStats,
    ITEM_CARGO_LINING,
    ITEM_CONTAINER_T1_PACKED,
    ITEM_FOCUSING_ARRAY,
    ITEM_HAULER_T1,
    ITEM_HULL_PLATES,
    ITEM_THRUSTER_CORE,
    type RecipeSlotInput,
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
            const result = blendStacks([{quantity: 40, stats: {strength: 600}}], 'strength')
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

        test('focusing array from precious stacks blends weighted average', function () {
            const stats = computeComponentStats(ITEM_FOCUSING_ARRAY, [
                {
                    category: 'precious',
                    stacks: [
                        {
                            quantity: 10,
                            stats: {conductivity: 200, ductility: 200, reflectivity: 200},
                        },
                        {
                            quantity: 15,
                            stats: {conductivity: 800, ductility: 800, reflectivity: 800},
                        },
                    ],
                },
            ])
            assert.equal(stats.length, 2)
            const cond = stats.find((s) => s.key === 'conductivity')
            const duc = stats.find((s) => s.key === 'ductility')
            assert.equal(cond!.value, 560)
            assert.equal(duc!.value, 560)
        })

        test('cargo lining from precious + organic', function () {
            const stats = computeComponentStats(ITEM_CARGO_LINING, [
                {
                    category: 'precious',
                    stacks: [
                        {
                            quantity: 10,
                            stats: {conductivity: 500, ductility: 700, reflectivity: 300},
                        },
                    ],
                },
                {
                    category: 'organic',
                    stacks: [
                        {quantity: 20, stats: {plasticity: 400, insulation: 200, purity: 800}},
                    ],
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
                [ITEM_CARGO_LINING]: [{quantity: 2, stats: {ductility: 600, purity: 700}}],
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

        test('decoded hauler stats use input stat key names', function () {
            const seed = encodeStats([500, 500, 500, 500])
            const decoded = decodeCraftedItemStats(ITEM_HAULER_T1, seed)
            assert.property(decoded, 'resonance')
            assert.property(decoded, 'conductivity')
            assert.property(decoded, 'clarity')
            assert.property(decoded, 'ductility')
            assert.notProperty(decoded, 'capacity')
            assert.notProperty(decoded, 'efficiency')
            assert.notProperty(decoded, 'drain')
        })
    })

    suite('encodeGatheredCargoStats', function () {
        test('round-trips derived stats via bit decode', function () {
            const depositSeed = 0x0badf00dcafebaben
            const encoded = encodeGatheredCargoStats(depositSeed)
            const raw = deriveResourceStats(depositSeed)
            const seed = BigInt(encoded.toString())
            assert.equal(decodeStat(seed, 0), raw.stat1)
            assert.equal(decodeStat(seed, 1), raw.stat2)
            assert.equal(decodeStat(seed, 2), raw.stat3)
        })

        test('returns a UInt64 instance', function () {
            const encoded = encodeGatheredCargoStats(0x123456789abcdef0n)
            assert.isFunction(encoded.toString)
            const second = encodeGatheredCargoStats(0x123456789abcdef0n)
            assert.isTrue(encoded.equals(second))
        })
    })

    suite('blendCargoStacks', function () {
        test('decodes raw-item stats via bit decode, not hash', function () {
            const packed = UInt64.from(encodeStats([278, 142, 162]))
            const result = blendCargoStacks(6, [{quantity: 1, stats: packed}])
            const decoded = decodeStats(BigInt(result.toString()), 3)
            assert.equal(decoded[0], 278)
            assert.equal(decoded[1], 142)
            assert.equal(decoded[2], 162)
        })
    })

    suite('computeCraftedOutputStats', function () {
        test('single-input single-category component (Thruster Core from gas)', function () {
            const seedA = 0x123456789abcdef0n
            const seedB = 0xfedcba9876543210n
            const slotInputs: RecipeSlotInput[] = [
                {
                    itemId: 1003,
                    category: 'gas',
                    stacks: [
                        {quantity: 20, stats: seedA},
                        {quantity: 12, stats: seedB},
                    ],
                },
            ]
            const outputStats = computeCraftedOutputStats(ITEM_THRUSTER_CORE, slotInputs)

            const rawA = {
                stat1: decodeStat(seedA, 0),
                stat2: decodeStat(seedA, 1),
                stat3: decodeStat(seedA, 2),
            }
            const rawB = {
                stat1: decodeStat(seedB, 0),
                stat2: decodeStat(seedB, 1),
                stat3: decodeStat(seedB, 2),
            }
            const expectedStats = computeComponentStats(ITEM_THRUSTER_CORE, [
                {
                    category: 'gas',
                    stacks: [
                        {
                            quantity: 20,
                            stats: {
                                volatility: rawA.stat1,
                                reactivity: rawA.stat2,
                                thermal: rawA.stat3,
                            },
                        },
                        {
                            quantity: 12,
                            stats: {
                                volatility: rawB.stat1,
                                reactivity: rawB.stat2,
                                thermal: rawB.stat3,
                            },
                        },
                    ],
                },
            ])
            const decoded = decodeCraftedItemStats(
                ITEM_THRUSTER_CORE,
                BigInt(outputStats.toString())
            )
            const vol = expectedStats.find((s) => s.key === 'volatility')!.value
            const thm = expectedStats.find((s) => s.key === 'thermal')!.value
            assert.equal(decoded['volatility'], vol)
            assert.equal(decoded['thermal'], thm)
        })

        test('multi-input multi-category component (Cargo Lining from precious + organic)', function () {
            const preciousSeed = 0x1111222233334444n
            const organicSeed = 0xaaaabbbbccccddddn
            const slotInputs: RecipeSlotInput[] = [
                {
                    itemId: 200,
                    category: 'precious',
                    stacks: [{quantity: 6, stats: preciousSeed}],
                },
                {
                    itemId: 500,
                    category: 'organic',
                    stacks: [{quantity: 14, stats: organicSeed}],
                },
            ]
            const outputStats = computeCraftedOutputStats(ITEM_CARGO_LINING, slotInputs)

            const rawP = {
                stat1: decodeStat(preciousSeed, 0),
                stat2: decodeStat(preciousSeed, 1),
                stat3: decodeStat(preciousSeed, 2),
            }
            const rawO = {
                stat1: decodeStat(organicSeed, 0),
                stat2: decodeStat(organicSeed, 1),
                stat3: decodeStat(organicSeed, 2),
            }
            const expectedStats = computeComponentStats(ITEM_CARGO_LINING, [
                {
                    category: 'precious',
                    stacks: [
                        {
                            quantity: 6,
                            stats: {
                                conductivity: rawP.stat1,
                                ductility: rawP.stat2,
                                reflectivity: rawP.stat3,
                            },
                        },
                    ],
                },
                {
                    category: 'organic',
                    stacks: [
                        {
                            quantity: 14,
                            stats: {
                                plasticity: rawO.stat1,
                                insulation: rawO.stat2,
                                purity: rawO.stat3,
                            },
                        },
                    ],
                },
            ])
            const decoded = decodeCraftedItemStats(
                ITEM_CARGO_LINING,
                BigInt(outputStats.toString())
            )
            const duc = expectedStats.find((s) => s.key === 'ductility')!.value
            const pur = expectedStats.find((s) => s.key === 'purity')!.value
            assert.equal(decoded['ductility'], duc)
            assert.equal(decoded['purity'], pur)
            assert.equal(decoded['ductility'], rawP.stat2)
            assert.equal(decoded['purity'], rawO.stat3)
        })

        test('entity recipe (Container packed from hull_plates + cargo_lining)', function () {
            const hullSeedA = encodeStats([500, 300])
            const hullSeedB = encodeStats([700, 400])
            const liningSeed = encodeStats([600, 800])

            const slotInputs: RecipeSlotInput[] = [
                {
                    itemId: ITEM_HULL_PLATES,
                    category: undefined,
                    stacks: [
                        {quantity: 4, stats: hullSeedA},
                        {quantity: 2, stats: hullSeedB},
                    ],
                },
                {
                    itemId: ITEM_CARGO_LINING,
                    category: undefined,
                    stacks: [{quantity: 2, stats: liningSeed}],
                },
            ]
            const outputStats = computeCraftedOutputStats(ITEM_CONTAINER_T1_PACKED, slotInputs)

            const expectedStats = computeEntityStats('container', {
                [ITEM_HULL_PLATES]: [
                    {quantity: 4, stats: {strength: 500, density: 300}},
                    {quantity: 2, stats: {strength: 700, density: 400}},
                ],
                [ITEM_CARGO_LINING]: [{quantity: 2, stats: {ductility: 600, purity: 800}}],
            })
            const decoded = decodeCraftedItemStats(
                ITEM_CONTAINER_T1_PACKED,
                BigInt(outputStats.toString())
            )
            for (const stat of expectedStats) {
                assert.equal(decoded[stat.key], stat.value, `mismatch on ${stat.key}`)
            }
            assert.equal(decoded['strength'], 566)
            assert.equal(decoded['density'], 333)
            assert.equal(decoded['ductility'], 600)
            assert.equal(decoded['purity'], 800)
        })

        test('throws for unknown output item id', function () {
            assert.throws(() => computeCraftedOutputStats(99999, []), /no recipe found/)
        })

        test('throws when entity recipe receives a category-only slot', function () {
            assert.throws(
                () =>
                    computeCraftedOutputStats(ITEM_CONTAINER_T1_PACKED, [
                        {
                            itemId: 200,
                            category: 'precious',
                            stacks: [{quantity: 1, stats: 0n}],
                        },
                    ]),
                /expects component inputs/
            )
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
            const min = computeContainerCapabilities({
                density: 1,
                strength: 500,
                ductility: 500,
                purity: 500,
            })
            const max = computeContainerCapabilities({
                density: 999,
                strength: 500,
                ductility: 500,
                purity: 500,
            })
            assert.isAtLeast(min.hullmass, 25000)
            assert.isAtMost(max.hullmass, 100000)
        })

        test('capacity range is 1M-10M', function () {
            const min = computeContainerCapabilities({
                strength: 1,
                ductility: 1,
                purity: 1,
                density: 500,
            })
            const max = computeContainerCapabilities({
                strength: 999,
                ductility: 999,
                purity: 999,
                density: 500,
            })
            assert.isAtLeast(min.capacity, 1000000)
            assert.isAtMost(max.capacity, 10100000)
        })

        test('density is inverted - lower density means lighter hull', function () {
            const low = computeContainerCapabilities({
                density: 100,
                strength: 500,
                ductility: 500,
                purity: 500,
            })
            const high = computeContainerCapabilities({
                density: 900,
                strength: 500,
                ductility: 500,
                purity: 500,
            })
            assert.isBelow(low.hullmass, high.hullmass)
        })
    })

    suite('T2 Container Capabilities', function () {
        test('T2 container has lighter hullmass than T1 at same density', function () {
            const t1 = computeContainerCapabilities({
                strength: 500,
                density: 500,
                ductility: 500,
                purity: 500,
            })
            const t2 = computeContainerT2Capabilities({
                strength: 500,
                density: 500,
                ductility: 500,
                purity: 500,
            })
            assert.isBelow(t2.hullmass, t1.hullmass)
        })

        test('T2 container has greater capacity than T1 at same stats', function () {
            const t1 = computeContainerCapabilities({
                strength: 500,
                density: 500,
                ductility: 500,
                purity: 500,
            })
            const t2 = computeContainerT2Capabilities({
                strength: 500,
                density: 500,
                ductility: 500,
                purity: 500,
            })
            assert.isAbove(t2.capacity, t1.capacity)
        })

        test('T2 container formulas match contract', function () {
            const stats = {strength: 400, density: 300, ductility: 600, purity: 200}
            const caps = computeContainerT2Capabilities(stats)
            assert.equal(caps.hullmass, 20000 + 50 * 300)
            const statSum = 400 + 600 + 200
            const expected = Math.floor(1500000 * Math.pow(10, statSum / 2500))
            assert.equal(caps.capacity, expected)
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

    suite('T2 cross-group blending', function () {
        test('blendCrossGroup averages stats from two groups with equal weights', function () {
            const result = blendCrossGroup([
                {value: 400, weight: 1},
                {value: 600, weight: 1},
            ])
            assert.equal(result, 500)
        })

        test('blendCrossGroup respects unequal weights', function () {
            const result = blendCrossGroup([
                {value: 400, weight: 3},
                {value: 800, weight: 1},
            ])
            assert.equal(result, 500)
        })

        test('blendCrossGroup clamps to 1-999', function () {
            assert.equal(blendCrossGroup([{value: 0, weight: 1}]), 1)
            assert.equal(blendCrossGroup([{value: 1500, weight: 1}]), 999)
        })
    })

    suite('calc_craft_energy', function () {
        test('basic energy calculation', function () {
            // Hull Plates: 450K input_mass × drain 17 / 150K = 51
            const energy = calc_craft_energy(17, 450000)
            assert.equal(energy.toNumber(), 51)
        })

        test('higher drain costs more energy', function () {
            const low = calc_craft_energy(5, 450000)
            const high = calc_craft_energy(30, 450000)
            assert.isAbove(high.toNumber(), low.toNumber())
        })

        test('zero input costs zero energy', function () {
            const energy = calc_craft_energy(17, 0)
            assert.equal(energy.toNumber(), 0)
        })

        test('scales linearly with batched input mass', function () {
            const single = calc_craft_energy(17, 450000)
            const batch = calc_craft_energy(17, 1350000)
            assert.equal(batch.toNumber(), single.toNumber() * 3)
        })

        test('energy clamps to uint16 max on oversized input', function () {
            const energy = calc_craft_energy(30, 450_000_000)
            assert.equal(energy.toNumber(), 65535)
        })
    })
})
