import {describe, expect, test} from 'bun:test'
import {computeHaulerCapacity} from '../src/nft/description'
import {computeHaulerCapabilities} from '../src/derivation/capabilities'

describe('tier-aware hauler tow capacity (min(1 + floor(stat * (tier + 2) / 1350), 2 + floor((tier - 1) / 3)))', () => {
    const cases: [number, number, number][] = [
        [0, 1, 1],
        [500, 1, 2],
        [500, 2, 2],
        [100, 2, 1],
        [999, 2, 2],
        [999, 4, 3],
    ]

    test.each(cases)('computeHaulerCapacity(%i, %i) === %i', (res, tier, expected) => {
        expect(computeHaulerCapacity(res, tier)).toBe(expected)
    })

    test.each(
        cases
    )('computeHaulerCapabilities mirror matches at res=%i tier=%i', (res, tier, expected) => {
        const caps = computeHaulerCapabilities(
            {insulation: res, reflectivity: 0, saturation: 0},
            tier
        )
        expect(caps.capacity).toBe(expected)
    })
})
