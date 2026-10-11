import {describe, expect, test} from 'bun:test'
import {computeLoaderThrust} from '../src/nft/description'
import {computeEntityCapabilities, computeLoaderCapabilities} from '../src/derivation/capabilities'
import {calc_onesided_duration} from '../src/travel/travel'
import {EntityClass} from '../src/data/kind-registry'
import {ITEM_LOADER_T1, ITEM_SHIP_T1_PACKED} from '../src/data/item-ids'
import {encodeStats} from '../src/derivation/crafting'

describe('quadratic loader thrust curve (1 + floor(pla^2 / 10000))', () => {
    const cases: [number, number][] = [
        [0, 1],
        [213, 5],
        [350, 13],
        [515, 27],
        [999, 100],
    ]

    test.each(cases)('computeLoaderThrust(%i) === %i', (pla, expected) => {
        expect(computeLoaderThrust(pla, 1)).toBe(expected)
    })

    test.each(cases)('computeLoaderCapabilities mirror matches at pla=%i', (pla, expected) => {
        const caps = computeLoaderCapabilities({insulation: 0, plasticity: pla}, 1)
        expect(caps.thrust).toBe(expected)
    })
})

describe('loader thrust floor', () => {
    test('a slot amp that truncates thrust to 0 leaves the lane at thrust 1', () => {
        const caps = computeEntityCapabilities(
            {},
            ITEM_SHIP_T1_PACKED,
            [{slotIndex: 0, itemId: ITEM_LOADER_T1, stats: encodeStats([213, 50])}],
            [{type: 'any', outputPct: 80}]
        )
        expect(caps.loaderLanes?.[0].thrust).toBe(1)
        expect(caps.loaders?.thrust).toBe(1)
    })

    test('a one-sided transfer prices thrust 0 as thrust 1', () => {
        const args = [
            20,
            0,
            0,
            EntityClass.OrbitalVessel,
            EntityClass.PlanetaryStructure,
            1000,
        ] as const
        const atZero = calc_onesided_duration(0, ...args)
        expect(atZero).toBeGreaterThan(0)
        expect(atZero).toBe(calc_onesided_duration(1, ...args))
    })
})
