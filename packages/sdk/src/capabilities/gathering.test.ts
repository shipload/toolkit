import {expect, test} from 'bun:test'
import type {GathererStats} from '../types/capabilities'
import {calc_gather_duration, calc_gather_energy} from './gathering'

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

test('splitting a bulk gather never undercuts total lane-time', () => {
    const g: GathererStats = {
        yield: {toNumber: () => 413},
        drain: {toNumber: () => 30},
        depth: {toNumber: () => 0, toString: () => '0'},
    }
    const bulk = Number(calc_gather_duration(g, 1000, 10, 8, 500))
    const unit = Number(calc_gather_duration(g, 1000, 1, 8, 500))
    // d1 >= 1 regime (bulk > quantity), where the split exploit lived
    expect(bulk).toBeGreaterThan(10)
    expect(unit * 10).toBeGreaterThanOrEqual(bulk)
})
