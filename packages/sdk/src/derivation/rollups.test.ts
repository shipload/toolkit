import {describe, expect, test} from 'bun:test'
import {ServerContract} from '../contracts'
import {rollupGatherer, rollupCrafter, rollupLoaders} from './rollups'

const gLane = (slot: number, y: number, d: number, depth: number) =>
    ServerContract.Types.gatherer_lane.from({
        slot_index: slot,
        yield: y,
        drain: d,
        depth,
        output_pct: 100,
    })
const cLane = (slot: number, s: number, d: number) =>
    ServerContract.Types.crafter_lane.from({slot_index: slot, speed: s, drain: d, output_pct: 100})
const lLane = (slot: number, m: number, t: number) =>
    ServerContract.Types.loader_lane.from({slot_index: slot, mass: m, thrust: t, output_pct: 100})

describe('rollupGatherer', () => {
    test('empty → undefined', () => {
        expect(rollupGatherer([])).toBeUndefined()
    })
    test('sums yield/drain, takes MAX depth', () => {
        const r = rollupGatherer([gLane(2, 300, 1250, 500), gLane(3, 250, 1000, 5495)])!
        expect(r.yield.toNumber()).toBe(550)
        expect(r.drain.toNumber()).toBe(2250)
        expect(r.depth.toNumber()).toBe(5495)
    })
    test('clamps summed yield to uint16', () => {
        const r = rollupGatherer([gLane(2, 60000, 0, 1), gLane(3, 60000, 0, 1)])!
        expect(r.yield.toNumber()).toBe(65535)
    })
})

describe('rollupCrafter', () => {
    test('empty → undefined', () => {
        expect(rollupCrafter([])).toBeUndefined()
    })
    test('sums speed/drain', () => {
        const r = rollupCrafter([cLane(2, 100, 30), cLane(3, 140, 25)])!
        expect(r.speed.toNumber()).toBe(240)
        expect(r.drain.toNumber()).toBe(55)
    })
})

describe('rollupLoaders', () => {
    test('empty → undefined', () => {
        expect(rollupLoaders([])).toBeUndefined()
    })
    test('integer-averages mass, sums thrust, counts quantity', () => {
        const r = rollupLoaders([lLane(2, 200, 5), lLane(3, 201, 7)])!
        expect(r.mass.toNumber()).toBe(200) // floor(401/2)
        expect(r.thrust.toNumber()).toBe(12)
        expect(r.quantity.toNumber()).toBe(2)
    })
})
