import {describe, expect, test} from 'bun:test'
import {computeHaulerCapacity} from '../src/nft/description'
import {computeHaulerCapabilities} from '../src/derivation/capabilities'

describe('tier-aware hauler tow capacity (max(tier, tier + floor(res / 400)))', () => {
    const cases: [number, number, number][] = [
        [500, 1, 2],
        [500, 2, 3],
        [100, 2, 2],
    ]

    test.each(cases)('computeHaulerCapacity(%i, %i) === %i', (res, tier, expected) => {
        expect(computeHaulerCapacity(res, tier)).toBe(expected)
    })

    test.each(
        cases
    )('computeHaulerCapabilities mirror matches at res=%i tier=%i', (res, tier, expected) => {
        const caps = computeHaulerCapabilities(
            {resonance: res, plasticity: 0, conductivity: 0},
            tier
        )
        expect(caps.capacity).toBe(expected)
    })
})
