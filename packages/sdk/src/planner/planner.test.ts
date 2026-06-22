import {UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {expect, test, describe} from 'bun:test'
import type {GathererStats} from '../types/capabilities'
import {ServerContract} from '../contracts'
import {calc_gather_duration} from '../capabilities/gathering'
import {planParallelGather, planParallelTransfer, type GatherPlanEntity} from './index'

function gathererLane(
    slotIndex: number,
    yieldVal: number,
    drain: number,
    depth: number
): ServerContract.Types.gatherer_lane {
    return ServerContract.Types.gatherer_lane.from({
        slot_index: UInt8.from(slotIndex),
        yield: UInt16.from(yieldVal),
        drain: UInt32.from(drain),
        depth: UInt16.from(depth),
        output_pct: UInt16.from(100),
    })
}

function loaderLane(
    slotIndex: number,
    mass: number,
    thrust: number
): ServerContract.Types.loader_lane {
    return ServerContract.Types.loader_lane.from({
        slot_index: UInt8.from(slotIndex),
        mass: UInt32.from(mass),
        thrust: UInt16.from(thrust),
        output_pct: UInt16.from(100),
    })
}

function energyStats(capacity: number, recharge: number): ServerContract.Types.energy_stats {
    return ServerContract.Types.energy_stats.from({
        capacity: UInt32.from(capacity),
        recharge: UInt32.from(recharge),
    })
}

interface EntityOverrides {
    gatherer_lanes?: ServerContract.Types.gatherer_lane[]
    loader_lanes?: ServerContract.Types.loader_lane[]
    generator?: ServerContract.Types.energy_stats
    energy?: number
    lanes?: ServerContract.Types.lane[]
}

function entity(overrides: EntityOverrides = {}): GatherPlanEntity {
    return {
        gatherer_lanes: overrides.gatherer_lanes ?? [],
        loader_lanes: overrides.loader_lanes ?? [],
        generator: overrides.generator,
        energy: overrides.energy !== undefined ? UInt16.from(overrides.energy) : undefined,
        lanes: overrides.lanes ?? [],
        coordinates: ServerContract.Types.coordinates.from({x: 0, y: 0}),
        cargo: [],
        cargomass: UInt32.from(0),
    }
}

const NOW = new Date('2026-06-21T00:00:00.000Z')

describe('planParallelGather', () => {
    test('sanity: single-gatherer qty 20 = ~35s matches calc_gather_duration', () => {
        const gatherer: GathererStats = {
            yield: UInt16.from(57),
            drain: UInt32.from(500),
            depth: UInt16.from(5000),
        }
        const dur = calc_gather_duration(gatherer, 228, 20, 0, 1000)
        expect(Number(dur)).toBeCloseTo(35, 0)
    })

    test('two gatherers: quantities proportional to yield, durations within 1s', () => {
        const YIELD1 = 200
        const YIELD2 = 400
        const DEPTH = 5000
        const DRAIN = 500
        const QUANTITY = 60
        const STRATUM = 0

        const e = entity({
            gatherer_lanes: [
                gathererLane(0, YIELD1, DRAIN, DEPTH),
                gathererLane(1, YIELD2, DRAIN, DEPTH),
            ],
            generator: energyStats(10000, 100),
            energy: 10000,
        })

        const plan = planParallelGather(e, {quantity: QUANTITY}, STRATUM, NOW)

        expect(plan).toHaveLength(2)
        expect(plan.reduce((s, p) => s + p.quantity, 0)).toBe(QUANTITY)

        const q1 = plan.find((p) => p.slot === 0)!.quantity
        const q2 = plan.find((p) => p.slot === 1)!.quantity
        expect(q1 + q2).toBe(QUANTITY)
        expect(q2 / q1).toBeCloseTo(YIELD2 / YIELD1, 0)

        const ITEM_MASS = 228
        const RICHNESS = 1000
        const g1: GathererStats = {
            yield: UInt16.from(YIELD1),
            drain: UInt32.from(DRAIN),
            depth: UInt16.from(DEPTH),
        }
        const g2: GathererStats = {
            yield: UInt16.from(YIELD2),
            drain: UInt32.from(DRAIN),
            depth: UInt16.from(DEPTH),
        }
        const dur1 = Number(calc_gather_duration(g1, ITEM_MASS, q1, STRATUM, RICHNESS))
        const dur2 = Number(calc_gather_duration(g2, ITEM_MASS, q2, STRATUM, RICHNESS))
        expect(Math.abs(dur1 - dur2)).toBeLessThan(1)
    })

    test("'max' target: uses all reaching lanes, each slot gets >= 1 unit", () => {
        const e = entity({
            gatherer_lanes: [gathererLane(0, 200, 500, 5000), gathererLane(1, 300, 500, 5000)],
            generator: energyStats(10000, 100),
            energy: 10000,
        })

        const plan = planParallelGather(e, 'max', 0, NOW)

        expect(plan.length).toBeGreaterThan(0)
        for (const entry of plan) {
            expect(entry.quantity).toBeGreaterThanOrEqual(1)
        }
    })

    test('energy-starved: drops the lowest-yield lane(s) until the pool sustains the plan', () => {
        // Full-Q energy: 3 lanes=>144, 2 lanes(drop yield=50)=>120; pool 130 fits 2 but not 3.
        const e = entity({
            gatherer_lanes: [
                gathererLane(0, 50, 10000, 5000),
                gathererLane(1, 100, 10000, 5000),
                gathererLane(2, 100, 10000, 5000),
            ],
            generator: energyStats(10000, 1),
            energy: 130,
        })

        const plan = planParallelGather(e, {quantity: 120}, 0, NOW)

        // Lowest-yield lane (slot 0) dropped; the two yield-100 lanes survive.
        expect(plan).toHaveLength(2)
        expect(plan.find((p) => p.slot === 0)).toBeUndefined()
        expect(plan.reduce((s, p) => s + p.quantity, 0)).toBe(120)
    })

    test('energy-starved: single lane caps quantity to the sustainable max', () => {
        // energyPerUnit=1, full Q=120 costs 120 > pool 50, so quantity caps at 50.
        const e = entity({
            gatherer_lanes: [gathererLane(0, 100, 10000, 5000)],
            generator: energyStats(10000, 1),
            energy: 50,
        })

        const plan = planParallelGather(e, {quantity: 120}, 0, NOW)

        expect(plan).toHaveLength(1)
        expect(plan[0].slot).toBe(0)
        expect(plan[0].quantity).toBe(50)
    })

    test('energy-starved: projected energy nets out a queued gather task', () => {
        // A queued task costing 9970 leaves 30 projected energy => quantity caps at 30.
        const queued = ServerContract.Types.lane.from({
            lane_key: UInt8.from(0),
            schedule: {
                started: NOW.toISOString().slice(0, -1),
                tasks: [
                    ServerContract.Types.task.from({
                        type: UInt8.from(5),
                        duration: UInt32.from(100),
                        cancelable: 0,
                        cargo: [],
                        entitytarget: {entity_type: 'ship', entity_id: UInt64.from(1)},
                        energy_cost: UInt32.from(9970),
                    }),
                ],
            },
        })

        const e = entity({
            gatherer_lanes: [gathererLane(0, 100, 10000, 5000)],
            generator: energyStats(10000, 1),
            energy: 10000,
            lanes: [queued],
        })

        const plan = planParallelGather(e, {quantity: 120}, 0, NOW)

        expect(plan).toHaveLength(1)
        expect(plan[0].quantity).toBe(30)
    })

    test('stratum filter: shallow lane excluded, only deep lane used', () => {
        const e = entity({
            gatherer_lanes: [gathererLane(0, 200, 500, 500), gathererLane(1, 300, 500, 5000)],
            generator: energyStats(10000, 100),
            energy: 10000,
        })

        const plan = planParallelGather(e, {quantity: 10}, 2000, NOW)

        expect(plan).toHaveLength(1)
        expect(plan[0].slot).toBe(1)
    })

    test('no reaching gatherers throws', () => {
        const e = entity({
            gatherer_lanes: [gathererLane(0, 200, 500, 100)],
            generator: energyStats(10000, 100),
            energy: 10000,
        })

        expect(() => planParallelGather(e, {quantity: 10}, 2000, NOW)).toThrow(
            'no gatherer reaches this stratum'
        )
    })

    test('two identical gatherers: per-lane quantity halved, durations equal and within 1s', () => {
        const YIELD = 200
        const DEPTH = 5000
        const DRAIN = 500
        const QUANTITY = 60
        const STRATUM = 0

        const eSingle = entity({
            gatherer_lanes: [gathererLane(0, YIELD, DRAIN, DEPTH)],
            generator: energyStats(10000, 100),
            energy: 10000,
        })
        const eDouble = entity({
            gatherer_lanes: [
                gathererLane(0, YIELD, DRAIN, DEPTH),
                gathererLane(1, YIELD, DRAIN, DEPTH),
            ],
            generator: energyStats(10000, 100),
            energy: 10000,
        })

        const planSingle = planParallelGather(eSingle, {quantity: QUANTITY}, STRATUM, NOW)
        const planDouble = planParallelGather(eDouble, {quantity: QUANTITY}, STRATUM, NOW)

        expect(planSingle).toHaveLength(1)
        expect(planDouble).toHaveLength(2)

        const singleQ = planSingle[0].quantity
        const doubleQ1 = planDouble[0].quantity
        const doubleQ2 = planDouble[1].quantity
        expect(doubleQ1 + doubleQ2).toBe(QUANTITY)

        const ITEM_MASS = 228
        const RICHNESS = 1000
        const g: GathererStats = {
            yield: UInt16.from(YIELD),
            drain: UInt32.from(DRAIN),
            depth: UInt16.from(DEPTH),
        }
        const durSingle = Number(calc_gather_duration(g, ITEM_MASS, singleQ, STRATUM, RICHNESS))
        const durDouble1 = Number(calc_gather_duration(g, ITEM_MASS, doubleQ1, STRATUM, RICHNESS))
        const durDouble2 = Number(calc_gather_duration(g, ITEM_MASS, doubleQ2, STRATUM, RICHNESS))

        expect(durDouble1).toBeCloseTo(durSingle / 2, 0)
        expect(durDouble2).toBeCloseTo(durSingle / 2, 0)
        expect(Math.abs(durDouble1 - durDouble2)).toBeLessThan(1)
    })
})

describe('planParallelTransfer', () => {
    test('two loader lanes: quantities proportional to thrust, sums to target', () => {
        const THRUST1 = 100
        const THRUST2 = 200
        const QUANTITY = 90

        const e = entity({
            loader_lanes: [loaderLane(0, 500, THRUST1), loaderLane(1, 500, THRUST2)],
        })

        const plan = planParallelTransfer(e, {quantity: QUANTITY})

        expect(plan).toHaveLength(2)
        expect(plan.reduce((s, p) => s + p.quantity, 0)).toBe(QUANTITY)

        const q1 = plan.find((p) => p.slot === 0)!.quantity
        const q2 = plan.find((p) => p.slot === 1)!.quantity
        expect(q2 / q1).toBeCloseTo(THRUST2 / THRUST1, 0)
    })

    test('no loader lanes: returns empty plan', () => {
        const plan = planParallelTransfer(entity({loader_lanes: []}), {quantity: 10})
        expect(plan).toHaveLength(0)
    })

    test('thrust=0 loader lane (no-loader/mobility case): returns empty plan', () => {
        const plan = planParallelTransfer(entity({loader_lanes: [loaderLane(0, 500, 0)]}), {
            quantity: 10,
        })
        expect(plan).toHaveLength(0)
    })

    test("'max' target: each loader lane gets >= 1 unit", () => {
        const e = entity({
            loader_lanes: [loaderLane(0, 500, 100), loaderLane(1, 500, 200)],
        })
        const plan = planParallelTransfer(e, 'max')
        expect(plan.length).toBeGreaterThan(0)
        for (const entry of plan) {
            expect(entry.quantity).toBeGreaterThanOrEqual(1)
        }
    })
})
