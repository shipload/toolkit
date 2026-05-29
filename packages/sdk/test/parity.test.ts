import {describe, test, expect} from 'bun:test'
import {UInt16} from '@wharfkit/antelope'
import {calc_gather_duration} from '../src/capabilities/gathering'
import {calc_craft_duration} from '../src/capabilities/crafting'
import {computeInputMass} from '../src/derivation/crafting'
import {ITEM_ORE_T1, ITEM_PLATE} from '../src/data/item-ids'
import {getItem} from '../src/data/catalog'
import {ServerContract} from '../src/contracts'

const GATHER_MASS_DIVISOR = 228
const GATHER_TIME_SCALE = 100
const DEPTH_PENALTY_DIVISOR = 5000

describe('gather duration parity matrix', () => {
    const cases = [
        {tonnage: 10, stratum: 1, richness: 500, yield: 250},
        {tonnage: 100, stratum: 1, richness: 500, yield: 250},
        {tonnage: 1000, stratum: 100, richness: 500, yield: 500},
        {tonnage: 5000, stratum: 1000, richness: 800, yield: 800},
        {tonnage: 10000, stratum: 10000, richness: 200, yield: 1000},
    ]

    for (const c of cases) {
        test(`tonnage=${c.tonnage} stratum=${c.stratum} richness=${c.richness} yield=${c.yield}`, () => {
            const oreT1 = getItem(ITEM_ORE_T1)
            expect(oreT1.mass).toBe(1000)

            const gatherer = ServerContract.Types.gatherer_stats.from({
                yield: UInt16.from(c.yield),
                drain: UInt16.from(100),
                depth: UInt16.from(65535),
            })
            const duration = calc_gather_duration(
                gatherer,
                oreT1.mass,
                c.tonnage,
                c.stratum,
                c.richness
            ).toNumber()

            // Hand-computed expected from the same transliterated formula.
            const massFactor = oreT1.mass / GATHER_MASS_DIVISOR
            const depthPenalty = 1 + c.stratum / DEPTH_PENALTY_DIVISOR
            const richnessMul = c.richness / 1000
            const expected = Math.floor(
                (c.tonnage * massFactor * GATHER_TIME_SCALE * depthPenalty) /
                    (c.yield * richnessMul)
            )

            expect(duration).toBe(expected)
        })
    }
})

describe('craft duration parity matrix', () => {
    test('single Plate at crafter.speed=200', () => {
        const ore = getItem(ITEM_ORE_T1)
        const inputMass = 10 * ore.mass // 10 t Ore x 1000 = 10000
        expect(inputMass).toBe(10000)
        const speed = 200
        const duration = calc_craft_duration(speed, inputMass).toNumber()
        expect(duration).toBe(50)
    })

    test('batch of 100 Plates at crafter.speed=200', () => {
        const ore = getItem(ITEM_ORE_T1)
        const inputMass = 100 * 10 * ore.mass // 1,000,000
        expect(inputMass).toBe(1_000_000)
        const speed = 200
        const duration = calc_craft_duration(speed, inputMass).toNumber()
        expect(duration).toBe(5000)
    })

    test('computeInputMass(Plate) reflects new catalog (10 t Ore x 1000)', () => {
        expect(computeInputMass(ITEM_PLATE)).toBe(10000)
    })
})
