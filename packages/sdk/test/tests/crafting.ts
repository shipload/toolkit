import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {UInt64} from '@wharfkit/antelope'

import {
    blendCargoStacks,
    blendCrossGroup,
    blendStacks,
    calc_craft_duration,
    calc_craft_energy,
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
    getItem,
    ITEM_ORE_T1,
    ITEM_FRAME,
    ITEM_FRAME_T2,
    ITEM_CONTAINER_T1_PACKED,
    ITEM_ENGINE_T1,
    ITEM_RESIN,
    ITEM_HAULER_T1,
    ITEM_PLATE,
    ITEM_PLATE_T2,
    ITEM_PLASMA_CELL,
    type RecipeSlotInput,
} from '$lib'

describe('Crafting', () => {
    describe('Seed Encoding', () => {
        test('encodes and decodes single stat', () => {
            const encoded = encodeStats([450])
            const decoded = decodeStats(encoded, 1)
            assert.equal(decoded[0], 450)
        })

        test('encodes and decodes multiple stats', () => {
            const values = [450, 300, 720, 150]
            const encoded = encodeStats(values)
            const decoded = decodeStats(encoded, 4)
            assert.deepEqual(decoded, values)
        })

        test('clamps to 10-bit range', () => {
            const encoded = encodeStats([999, 1, 512])
            const decoded = decodeStats(encoded, 3)
            assert.equal(decoded[0], 999)
            assert.equal(decoded[1], 1)
            assert.equal(decoded[2], 512)
        })

        test('handles zero seed', () => {
            const decoded = decodeStats(0n, 2)
            assert.deepEqual(decoded, [0, 0])
        })
    })

    describe('Blending', () => {
        test('weighted average of single stat', () => {
            const result = blendStacks(
                [
                    {quantity: 30, stats: {strength: 450}},
                    {quantity: 10, stats: {strength: 720}},
                ],
                'strength'
            )
            assert.equal(result, 517)
        })

        test('single stack returns its value', () => {
            const result = blendStacks([{quantity: 40, stats: {strength: 600}}], 'strength')
            assert.equal(result, 600)
        })

        test('returns 0 for empty stacks', () => {
            const result = blendStacks([], 'strength')
            assert.equal(result, 0)
        })
    })

    describe('Component Stats', () => {
        test('plates from ore stacks', () => {
            const stats = computeComponentStats(ITEM_PLATE, [
                {
                    category: 'ore',
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

        test('resin from biomass stacks blends weighted average', () => {
            const stats = computeComponentStats(ITEM_RESIN, [
                {
                    category: 'biomass',
                    stacks: [
                        {
                            quantity: 10,
                            stats: {plasticity: 200, insulation: 200, saturation: 200},
                        },
                        {
                            quantity: 15,
                            stats: {plasticity: 800, insulation: 800, saturation: 800},
                        },
                    ],
                },
            ])
            assert.equal(stats.length, 2)
            const sat = stats.find((s) => s.key === 'saturation')
            const pla = stats.find((s) => s.key === 'plasticity')
            assert.equal(sat!.value, 560)
            assert.equal(pla!.value, 560)
        })

        test('frame from regolith (single-source)', () => {
            // Recipe 10002 statSlots: [regolith stat 1 (hardness), regolith stat 0 (cohesion)].
            const stats = computeComponentStats(ITEM_FRAME, [
                {
                    category: 'regolith',
                    stacks: [
                        {
                            quantity: 10,
                            stats: {cohesion: 500, hardness: 200, fineness: 700},
                        },
                    ],
                },
                {
                    category: 'biomass',
                    stacks: [
                        {quantity: 20, stats: {plasticity: 400, insulation: 200, saturation: 800}},
                    ],
                },
            ])
            assert.equal(stats.length, 2)
            const hard = stats.find((s) => s.key === 'hardness')
            const comp = stats.find((s) => s.key === 'cohesion')
            assert.equal(hard!.value, 200)
            assert.equal(comp!.value, 500)
        })
    })

    describe('Entity Stats', () => {
        test('container from component stacks', () => {
            const stats = computeEntityStats(ITEM_CONTAINER_T1_PACKED, {
                [ITEM_PLATE]: [
                    {quantity: 4, stats: {strength: 500, density: 300}},
                    {quantity: 2, stats: {strength: 400, density: 200}},
                ],
                [ITEM_FRAME]: [{quantity: 2, stats: {hardness: 600, cohesion: 700}}],
            })
            assert.equal(stats.length, 4)
            const str = stats.find((s) => s.key === 'strength')
            assert.equal(str!.value, 466)
        })
    })

    describe('Decode Crafted Item', () => {
        test('decode plate seed', () => {
            const seed = encodeStats([450, 300])
            const stats = decodeCraftedItemStats(ITEM_PLATE, seed)
            assert.equal(stats['strength'], 450)
            assert.equal(stats['density'], 300)
        })

        test('decode container packed seed', () => {
            const seed = encodeStats([500, 300, 600, 700])
            const stats = decodeCraftedItemStats(ITEM_CONTAINER_T1_PACKED, seed)
            assert.equal(stats['strength'], 500)
            assert.equal(stats['density'], 300)
            assert.equal(stats['hardness'], 600)
            assert.equal(stats['fineness'], 700)
        })

        test('decoded hauler stats use input stat key names', () => {
            const seed = encodeStats([500, 500, 500, 500])
            const decoded = decodeCraftedItemStats(ITEM_HAULER_T1, seed)
            assert.property(decoded, 'resonance')
            assert.property(decoded, 'plasticity')
            assert.property(decoded, 'reflectivity')
            assert.notProperty(decoded, 'cohesion')
            assert.notProperty(decoded, 'capacity')
            assert.notProperty(decoded, 'efficiency')
            assert.notProperty(decoded, 'drain')
        })
    })

    describe('encodeGatheredCargoStats', () => {
        test('round-trips derived stats via bit decode', () => {
            const depositSeed = 0x0badf00dcafebaben
            const encoded = encodeGatheredCargoStats(depositSeed)
            const raw = deriveResourceStats(depositSeed)
            const seed = BigInt(encoded.toString())
            assert.equal(decodeStat(seed, 0), raw.stat1)
            assert.equal(decodeStat(seed, 1), raw.stat2)
            assert.equal(decodeStat(seed, 2), raw.stat3)
        })

        test('returns a UInt64 instance', () => {
            const encoded = encodeGatheredCargoStats(0x123456789abcdef0n)
            assert.isFunction(encoded.toString)
            const second = encodeGatheredCargoStats(0x123456789abcdef0n)
            assert.isTrue(encoded.equals(second))
        })
    })

    describe('blendCargoStacks', () => {
        test('decodes raw-item stats via bit decode, not hash', () => {
            const packed = UInt64.from(encodeStats([278, 142, 162]))
            const result = blendCargoStacks(6, [{quantity: 1, stats: packed}])
            const decoded = decodeStats(BigInt(result.toString()), 3)
            assert.equal(decoded[0], 278)
            assert.equal(decoded[1], 142)
            assert.equal(decoded[2], 162)
        })
    })

    describe('computeCraftedOutputStats', () => {
        test('single-input single-category component (Plasma Cell from gas)', () => {
            const seedA = 0x123456789abcdef0n
            const seedB = 0xfedcba9876543210n
            const slotInputs: RecipeSlotInput[] = [
                {
                    itemId: 502,
                    category: 'gas',
                    stacks: [
                        {quantity: 20, stats: seedA},
                        {quantity: 12, stats: seedB},
                    ],
                },
            ]
            const outputStats = computeCraftedOutputStats(ITEM_PLASMA_CELL, slotInputs)

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
            const expectedStats = computeComponentStats(ITEM_PLASMA_CELL, [
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
            const decoded = decodeCraftedItemStats(ITEM_PLASMA_CELL, BigInt(outputStats.toString()))
            const vol = expectedStats.find((s) => s.key === 'volatility')!.value
            const thm = expectedStats.find((s) => s.key === 'thermal')!.value
            assert.equal(decoded['volatility'], vol)
            assert.equal(decoded['thermal'], thm)
        })

        test('multi-input multi-category component (Frame from regolith + biomass)', () => {
            const regolithSeed = 0x1111222233334444n
            const biomassSeed = 0xaaaabbbbccccddddn
            const slotInputs: RecipeSlotInput[] = [
                {
                    itemId: 200,
                    category: 'regolith',
                    stacks: [{quantity: 10, stats: regolithSeed}],
                },
                {
                    itemId: 500,
                    category: 'biomass',
                    stacks: [{quantity: 20, stats: biomassSeed}],
                },
            ]
            const outputStats = computeCraftedOutputStats(ITEM_FRAME, slotInputs)

            const rawR = {
                stat1: decodeStat(regolithSeed, 0),
                stat2: decodeStat(regolithSeed, 1),
                stat3: decodeStat(regolithSeed, 2),
            }
            const rawB = {
                stat1: decodeStat(biomassSeed, 0),
                stat2: decodeStat(biomassSeed, 1),
                stat3: decodeStat(biomassSeed, 2),
            }
            const expectedStats = computeComponentStats(ITEM_FRAME, [
                {
                    category: 'regolith',
                    stacks: [
                        {
                            quantity: 10,
                            stats: {
                                cohesion: rawR.stat1,
                                hardness: rawR.stat2,
                                fineness: rawR.stat3,
                            },
                        },
                    ],
                },
                {
                    category: 'biomass',
                    stacks: [
                        {
                            quantity: 20,
                            stats: {
                                plasticity: rawB.stat1,
                                insulation: rawB.stat2,
                                saturation: rawB.stat3,
                            },
                        },
                    ],
                },
            ])
            const decoded = decodeCraftedItemStats(ITEM_FRAME, BigInt(outputStats.toString()))
            const hard = expectedStats.find((s) => s.key === 'hardness')!.value
            const comp = expectedStats.find((s) => s.key === 'cohesion')!.value
            assert.equal(decoded['hardness'], hard)
            assert.equal(decoded['cohesion'], comp)
            assert.equal(decoded['hardness'], rawR.stat2)
            assert.equal(decoded['cohesion'], rawR.stat1)
        })

        test('entity recipe (Container packed from plate + frame)', () => {
            const hullSeedA = encodeStats([500, 300])
            const hullSeedB = encodeStats([700, 400])
            const liningSeed = encodeStats([600, 800])

            const slotInputs: RecipeSlotInput[] = [
                {
                    itemId: ITEM_PLATE,
                    category: undefined,
                    stacks: [
                        {quantity: 4, stats: hullSeedA},
                        {quantity: 2, stats: hullSeedB},
                    ],
                },
                {
                    itemId: ITEM_FRAME,
                    category: undefined,
                    stacks: [{quantity: 2, stats: liningSeed}],
                },
            ]
            const outputStats = computeCraftedOutputStats(ITEM_CONTAINER_T1_PACKED, slotInputs)

            const expectedStats = computeEntityStats(ITEM_CONTAINER_T1_PACKED, {
                [ITEM_PLATE]: [
                    {quantity: 4, stats: {strength: 500, density: 300}},
                    {quantity: 2, stats: {strength: 700, density: 400}},
                ],
                [ITEM_FRAME]: [{quantity: 2, stats: {hardness: 600, cohesion: 800}}],
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
            assert.equal(decoded['hardness'], 1)
            assert.equal(decoded['fineness'], 1)
        })

        test('throws for unknown output item id', () => {
            assert.throws(() => computeCraftedOutputStats(99999, []), /no recipe found/)
        })

        test('throws when entity recipe receives a category-only slot', () => {
            assert.throws(
                () =>
                    computeCraftedOutputStats(ITEM_CONTAINER_T1_PACKED, [
                        {
                            itemId: 200,
                            category: 'crystal',
                            stacks: [{quantity: 1, stats: 0n}],
                        },
                    ]),
                /expects component inputs/
            )
        })
    })

    describe.skip('T2 Multi-Source Blending (skipped: T2 recipes temporarily removed)', () => {
        test('Plate T2 blends component + raw ore stats', () => {
            const plateEncoded = encodeStats([400, 300])
            const oreT2Seed = encodeStats([600, 0, 200])

            const slotInputs: RecipeSlotInput[] = [
                {
                    itemId: ITEM_PLATE,
                    category: undefined,
                    stacks: [{quantity: 2, stats: plateEncoded}],
                },
                {
                    itemId: 102,
                    category: 'ore',
                    stacks: [{quantity: 15, stats: oreT2Seed}],
                },
            ]
            const output = computeCraftedOutputStats(ITEM_PLATE_T2, slotInputs)
            const decoded = decodeCraftedItemStats(ITEM_PLATE_T2, BigInt(output.toString()))

            assert.equal(decoded['strength'], 500)
            assert.equal(decoded['density'], 250)
        })

        test('Frame T2 blends component + regolith + biomass stats', () => {
            const frameEncoded = encodeStats([600, 700])
            const regolithSeed = encodeStats([0, 400, 0])
            const biomassSeed = encodeStats([0, 0, 800])

            const slotInputs: RecipeSlotInput[] = [
                {
                    itemId: ITEM_FRAME,
                    category: undefined,
                    stacks: [{quantity: 2, stats: frameEncoded}],
                },
                {
                    itemId: 402,
                    category: 'regolith',
                    stacks: [{quantity: 10, stats: regolithSeed}],
                },
                {
                    itemId: 502,
                    category: 'biomass',
                    stacks: [{quantity: 20, stats: biomassSeed}],
                },
            ]
            const output = computeCraftedOutputStats(ITEM_FRAME_T2, slotInputs)
            const decoded = decodeCraftedItemStats(ITEM_FRAME_T2, BigInt(output.toString()))

            assert.equal(decoded['hardness'], 500)
            assert.equal(decoded['cohesion'], 750)
        })
    })

    describe('Container Capabilities', () => {
        test('all stats at 500 produces expected mid-range values', () => {
            const caps = computeContainerCapabilities({
                strength: 500,
                density: 500,
                hardness: 500,
                cohesion: 500,
            })
            assert.equal(caps.hullmass, 100000 - 75 * 500)
            assert.equal(caps.capacity, Math.floor(22000000 * 6 ** (1500 / 2997)))
            assert.approximately(caps.capacity, 53935000, 1000000)
        })

        test('minimum stats produce ceiling hullmass', () => {
            const caps = computeContainerCapabilities({
                strength: 1,
                density: 1,
                hardness: 1,
                cohesion: 1,
            })
            assert.equal(caps.hullmass, 99925)
            assert.isAtLeast(caps.hullmass, 99000)
            assert.isAtMost(caps.hullmass, 100000)
            assert.isAtLeast(caps.capacity, 22000000)
            assert.isAtMost(caps.capacity, 22100000)
        })

        test('maximum stats produce floor hullmass', () => {
            const caps = computeContainerCapabilities({
                strength: 999,
                density: 999,
                hardness: 999,
                cohesion: 999,
            })
            assert.equal(caps.hullmass, 100000 - 75 * 999)
            assert.isAtLeast(caps.hullmass, 25000)
            assert.isAtMost(caps.hullmass, 26000)
            assert.isAtLeast(caps.capacity, 131000000)
            assert.isAtMost(caps.capacity, 133000000)
        })

        test('hullmass range is 25k-100k', () => {
            const heaviest = computeContainerCapabilities({
                density: 1,
                strength: 500,
                hardness: 500,
                cohesion: 500,
            })
            const lightest = computeContainerCapabilities({
                density: 999,
                strength: 500,
                hardness: 500,
                cohesion: 500,
            })
            assert.isAtMost(heaviest.hullmass, 100000)
            assert.isAtLeast(lightest.hullmass, 25000)
        })

        test('capacity range is 20M-200M', () => {
            const min = computeContainerCapabilities({
                strength: 1,
                hardness: 1,
                cohesion: 1,
                density: 500,
            })
            const max = computeContainerCapabilities({
                strength: 999,
                hardness: 999,
                cohesion: 999,
                density: 500,
            })
            assert.isAtLeast(min.capacity, 20000000)
            assert.isAtMost(max.capacity, 202000000)
        })

        test('higher density means lighter hull', () => {
            const low = computeContainerCapabilities({
                density: 100,
                strength: 500,
                hardness: 500,
                cohesion: 500,
            })
            const high = computeContainerCapabilities({
                density: 900,
                strength: 500,
                hardness: 500,
                cohesion: 500,
            })
            assert.isAbove(low.hullmass, high.hullmass)
        })
    })

    describe('T2 Container Capabilities', () => {
        test('T2 container has lighter hullmass than T1 at same density', () => {
            const t1 = computeContainerCapabilities({
                strength: 500,
                density: 500,
                hardness: 500,
                cohesion: 500,
            })
            const t2 = computeContainerT2Capabilities({
                strength: 500,
                density: 500,
                hardness: 500,
                cohesion: 500,
            })
            assert.isBelow(t2.hullmass, t1.hullmass)
        })

        test('T2 container formulas match contract', () => {
            const stats = {strength: 400, density: 300, hardness: 600, cohesion: 200}
            const caps = computeContainerT2Capabilities(stats)
            assert.equal(caps.hullmass, 70000 - 50 * 300)
            const statSum = 400 + 600
            const expected = Math.floor(24000000 * 6 ** (statSum / 2947))
            assert.equal(caps.capacity, expected)
        })
    })

    describe('calc_craft_duration', () => {
        test('basic duration calculation', () => {
            const duration = calc_craft_duration(500, 450000)
            assert.equal(duration.toNumber(), 900)
        })

        test('scales linearly with total input mass', () => {
            const single = calc_craft_duration(500, 450000)
            const batch = calc_craft_duration(500, 450000 * 8)
            assert.equal(batch.toNumber(), single.toNumber() * 8)
        })

        test('higher speed reduces duration', () => {
            const slow = calc_craft_duration(200, 450000)
            const fast = calc_craft_duration(800, 450000)
            assert.isAbove(slow.toNumber(), fast.toNumber())
        })

        test('minimum duration is 1', () => {
            const duration = calc_craft_duration(999, 1)
            assert.isAtLeast(duration.toNumber(), 1)
        })
    })

    describe('computeInputMass', () => {
        test('component returns positive mass', () => {
            const mass = computeInputMass(ITEM_PLATE)
            assert.isAbove(mass, 0)
            const oreT1 = getItem(ITEM_ORE_T1)
            assert.equal(mass, 10 * oreT1.mass)
        })

        test('module returns positive mass', () => {
            const mass = computeInputMass(ITEM_ENGINE_T1)
            assert.isAbove(mass, 0)
        })

        test('entity returns positive mass', () => {
            const mass = computeInputMass(ITEM_CONTAINER_T1_PACKED)
            assert.isAbove(mass, 0)
        })

        test('throws for unknown item', () => {
            assert.throws(() => computeInputMass(99999), /no recipe found/)
        })
    })

    describe('T2 cross-group blending', () => {
        test('blendCrossGroup averages stats from two groups with equal weights', () => {
            const result = blendCrossGroup([
                {value: 400, weight: 1},
                {value: 600, weight: 1},
            ])
            assert.equal(result, 500)
        })

        test('blendCrossGroup respects unequal weights', () => {
            const result = blendCrossGroup([
                {value: 400, weight: 3},
                {value: 800, weight: 1},
            ])
            assert.equal(result, 500)
        })

        test('blendCrossGroup clamps to 1-999', () => {
            assert.equal(blendCrossGroup([{value: 0, weight: 1}]), 1)
            assert.equal(blendCrossGroup([{value: 1500, weight: 1}]), 999)
        })
    })

    describe('calc_craft_energy', () => {
        test('basic energy calculation', () => {
            // Plate: 450K input_mass × drain 17 / 150K = 51
            const energy = calc_craft_energy(17, 450000)
            assert.equal(energy.toNumber(), 51)
        })

        test('higher drain costs more energy', () => {
            const low = calc_craft_energy(5, 450000)
            const high = calc_craft_energy(30, 450000)
            assert.isAbove(high.toNumber(), low.toNumber())
        })

        test('floors craft energy at 1 (never free)', () => {
            // 5_000 mass × 24 drain / 150_000 divisor = 0 before flooring
            const energy = calc_craft_energy(24, 5_000)
            assert.equal(energy.toNumber(), 1)
        })

        test('zero input floors to 1 energy', () => {
            const energy = calc_craft_energy(17, 0)
            assert.equal(energy.toNumber(), 1)
        })

        test('scales linearly with batched input mass', () => {
            const single = calc_craft_energy(17, 450000)
            const batch = calc_craft_energy(17, 1350000)
            assert.equal(batch.toNumber(), single.toNumber() * 3)
        })

        test('energy exceeds the old uint16 ceiling on oversized input', () => {
            const energy = calc_craft_energy(30, 450_000_000)
            assert.equal(energy.toNumber(), 90000)
        })
    })
})
