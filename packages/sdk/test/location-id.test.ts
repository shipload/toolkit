import {expect, test} from 'bun:test'
import {coordsToLocationId, locationIdToCoords} from '../src/index-module'

const CASES = [
    {x: 0, y: 0},
    {x: 1, y: 1},
    {x: -1, y: -1},
    {x: 24, y: 1},
    {x: -5, y: 6},
    {x: 2147483647, y: 2147483647},
    {x: -2147483648, y: -2147483648},
    {x: 2147483647, y: -2147483648},
]

test('a location id round-trips back to its coordinates', () => {
    for (const coords of CASES) {
        expect(locationIdToCoords(coordsToLocationId(coords))).toEqual(coords)
    }
})

test('location ids exceed the safe integer range, so the inverse must stay on bigint', () => {
    const id = coordsToLocationId({x: 24, y: 1})
    expect(BigInt(id.toString()) > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true)
    expect(locationIdToCoords(id)).toEqual({x: 24, y: 1})
})
