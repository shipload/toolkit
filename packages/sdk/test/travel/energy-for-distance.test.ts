import {describe, expect, test} from 'bun:test'
import {UInt32, UInt64} from '@wharfkit/antelope'
import {
    calc_energyusage,
    distanceBetweenPoints,
    hasEnergyForDistance,
} from '../../src/travel/travel'
import type {ShipLike} from '../../src/types'

const A = {x: -49, y: 50}
const NEAR_A = {x: -47, y: 48}
const DRAIN = 224_517

function ship(energy: number, drain = DRAIN): ShipLike {
    return {
        coordinates: {x: A.x, y: A.y},
        engines: {thrust: UInt32.from(800), drain: UInt32.from(drain)},
        energy: UInt32.from(energy),
    } as unknown as ShipLike
}

describe('hasEnergyForDistance', () => {
    test('charges the full fractional distance the chain charges', () => {
        const distance = distanceBetweenPoints(A.x, A.y, NEAR_A.x, NEAR_A.y)
        expect(Number(distance)).toBe(28_284)

        const cost = Number(calc_energyusage(distance, DRAIN))
        expect(cost).toBe(635_023)

        expect(hasEnergyForDistance(ship(500_000), distance)).toBe(false)
        expect(hasEnergyForDistance(ship(cost), distance)).toBe(true)
        expect(hasEnergyForDistance(ship(cost - 1), distance)).toBe(false)
    })

    test('agrees with calc_energyusage over a range of hops and drains', () => {
        for (const [dx, dy] of [
            [1, 0],
            [2, 2],
            [5, 3],
            [40, 0],
            [93, 71],
        ]) {
            for (const drain of [1, 2000, 224_517, 1_000_000]) {
                const distance = distanceBetweenPoints(0, 0, dx, dy)
                const cost = UInt64.from(calc_energyusage(distance, drain))
                expect(hasEnergyForDistance(ship(Number(cost), drain), distance)).toBe(true)
                if (Number(cost) > 0) {
                    expect(hasEnergyForDistance(ship(Number(cost) - 1, drain), distance)).toBe(
                        false
                    )
                }
            }
        }
    })

    test('reports no energy for a ship without engines', () => {
        expect(
            hasEnergyForDistance({energy: UInt32.from(1e6)} as unknown as ShipLike, 10_000)
        ).toBe(false)
    })
})
