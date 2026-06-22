import {expect, test} from 'bun:test'
import type {GathererStats} from '../types/capabilities'
import {calc_gather_energy} from './gathering'

function gatherer(drain: number): GathererStats {
    return {
        yield: {toNumber: () => 1},
        drain: {toNumber: () => drain},
        depth: {toNumber: () => 0, toString: () => '0'},
    }
}

test('calc_gather_energy does not clamp above the old uint16 ceiling', () => {
    const energy = calc_gather_energy(gatherer(30), 400_000_000)
    expect(Number(energy)).toBeGreaterThan(65535)
})
