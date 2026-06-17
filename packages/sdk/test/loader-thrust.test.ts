import {describe, expect, test} from 'bun:test'
import {computeLoaderThrust} from '../src/nft/description'
import {computeLoaderCapabilities} from '../src/derivation/capabilities'

describe('quadratic loader thrust curve (1 + floor(pla^2 / 10000))', () => {
    const cases: [number, number][] = [
        [0, 1],
        [213, 5],
        [350, 13],
        [515, 27],
        [999, 100],
    ]

    test.each(cases)('computeLoaderThrust(%i) === %i', (pla, expected) => {
        expect(computeLoaderThrust(pla)).toBe(expected)
    })

    test.each(cases)('computeLoaderCapabilities mirror matches at pla=%i', (pla, expected) => {
        const caps = computeLoaderCapabilities({insulation: 0, plasticity: pla})
        expect(caps.thrust).toBe(expected)
    })
})
