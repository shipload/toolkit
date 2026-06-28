import {describe, expect, test} from 'bun:test'
import {locationsInBox, scanReady} from '../../src/scan'
import {deriveLocationSize, deriveLocationStatic} from '../../src'

const GAME = '11'.repeat(32)

interface LocCell {
    x: number
    y: number
    locType: number
    subtype: number
    size: number
}

function jsReference(xMin: number, yMin: number, xMax: number, yMax: number): LocCell[] {
    const ref: LocCell[] = []
    for (let x = xMin; x <= xMax; x++)
        for (let y = yMin; y <= yMax; y++) {
            const ls = deriveLocationStatic(GAME, {x, y})
            const locType = Number(ls.type)
            if (locType === 0) continue
            ref.push({x, y, locType, subtype: Number(ls.subtype), size: deriveLocationSize(ls)})
        }
    return ref
}

describe('@shipload/sdk/scan locationsInBox', () => {
    test('parity with JS reference over a region with mixed types + empties', async () => {
        await scanReady()
        const ref = jsReference(5000, 5000, 5060, 5060)
        expect(ref.length).toBeGreaterThan(0)
        expect(locationsInBox(GAME, 5000, 5000, 5060, 5060)).toEqual(ref)
    })

    test('overflow retry returns the full set when systems exceed the initial cap', async () => {
        await scanReady()
        const ref = jsReference(5000, 5000, 5080, 5080)
        expect(ref.length).toBeGreaterThan(256)
        expect(locationsInBox(GAME, 5000, 5000, 5080, 5080)).toEqual(ref)
    })

    test('parity across negative coordinates', async () => {
        await scanReady()
        const ref = jsReference(-40, 280, 40, 320)
        expect(locationsInBox(GAME, -40, 280, 40, 320)).toEqual(ref)
    })
})
