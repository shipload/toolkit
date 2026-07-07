import {UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {expect, test, describe} from 'bun:test'
import {ServerContract} from '../contracts'
import {
    planParallelTransfer,
    type GatherPlanEntity,
    gatherEnergyCost,
    splitCost,
    maxQtyForCharge,
    buildGatherPlan,
} from './index'

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

describe('cost helpers', () => {
    const STRATUM = 100
    const ITEM_MASS = 1000
    const RICHNESS = 500

    test('gatherEnergyCost is 0 for non-positive quantity and positive otherwise', () => {
        const lane = gathererLane(0, 700, 1250, 5000)
        expect(gatherEnergyCost(lane, 0, STRATUM, ITEM_MASS, RICHNESS)).toBe(0)
        expect(gatherEnergyCost(lane, 100, STRATUM, ITEM_MASS, RICHNESS)).toBeGreaterThan(0)
    })

    test('splitCost across two lanes is monotonic non-decreasing in quantity', () => {
        const reaching = [gathererLane(0, 700, 1250, 5000), gathererLane(1, 700, 1250, 5000)]
        const c100 = splitCost(reaching, 100, STRATUM, ITEM_MASS, RICHNESS)
        const c200 = splitCost(reaching, 200, STRATUM, ITEM_MASS, RICHNESS)
        expect(c200).toBeGreaterThanOrEqual(c100)
    })

    test('maxQtyForCharge returns hi when the whole batch fits the charge', () => {
        const reaching = [gathererLane(0, 700, 1250, 5000)]
        // capacity huge → the full 500 fits
        expect(maxQtyForCharge(reaching, 500, 1_000_000, STRATUM, ITEM_MASS, RICHNESS)).toBe(500)
    })

    test('maxQtyForCharge finds the boundary: result fits, result+1 does not', () => {
        const reaching = [gathererLane(0, 700, 1250, 5000)]
        const capacity = 40
        const q = maxQtyForCharge(reaching, 100_000, capacity, STRATUM, ITEM_MASS, RICHNESS)
        expect(splitCost(reaching, q, STRATUM, ITEM_MASS, RICHNESS)).toBeLessThanOrEqual(capacity)
        expect(splitCost(reaching, q + 1, STRATUM, ITEM_MASS, RICHNESS)).toBeGreaterThan(capacity)
    })
})

describe('buildGatherPlan', () => {
    const STRATUM = 100
    const OPTS = {
        richness: 500,
        itemMass: 1000,
        holdRoom: 1_000_000,
        reserveRemaining: 1_000_000,
        now: NOW,
    }

    test('single cycle when the target fits one charge and energy is full', () => {
        const e = entity({
            gatherer_lanes: [gathererLane(0, 700, 1250, 5000)],
            generator: energyStats(1200, 2),
            energy: 1200,
        })
        const plan = buildGatherPlan(e, STRATUM, {quantity: 100}, OPTS)
        expect(plan.cycleCount).toBe(1)
        expect(plan.totalOre).toBe(100)
        expect(plan.cycles[0].rechargeBefore).toBe(false)
        expect(plan.cycles[0].limpets).toHaveLength(1)
        expect(plan.cycles[0].limpets[0].quantity).toBe(100)
        expect(plan.cap).toBe('requested')
    })

    test('two limpets split one charge proportional to yield, finish within 1s of each other', () => {
        const e = entity({
            gatherer_lanes: [gathererLane(0, 200, 500, 5000), gathererLane(1, 400, 500, 5000)],
            generator: energyStats(60_000, 2),
            energy: 60_000,
        })
        const plan = buildGatherPlan(e, STRATUM, {quantity: 60}, OPTS)
        expect(plan.cycleCount).toBe(1)
        const [a, b] = plan.cycles[0].limpets
        expect(a.quantity + b.quantity).toBe(60)
        expect(b.quantity).toBeGreaterThan(a.quantity) // higher yield gets more
        expect(Math.abs(a.durationSeconds - b.durationSeconds)).toBeLessThanOrEqual(2)
    })

    test('multi-cycle: fills beyond one charge; totalOre equals fill target; each cycle fits the charge', () => {
        const CAP = 40
        const e = entity({
            gatherer_lanes: [gathererLane(0, 700, 1250, 5000)],
            generator: energyStats(CAP, 2),
            energy: CAP,
        })
        const plan = buildGatherPlan(e, STRATUM, {quantity: 500}, OPTS)
        expect(plan.cycleCount).toBeGreaterThan(1)
        expect(plan.totalOre).toBe(500)
        // every cycle's summed gather cost fits one full charge
        for (const c of plan.cycles) {
            const cost = splitCost(
                e.gatherer_lanes,
                c.batchOre,
                STRATUM,
                OPTS.itemMass,
                OPTS.richness
            )
            expect(cost).toBeLessThanOrEqual(CAP)
        }
        // cycles after the first recharge to full
        expect(plan.cycles.slice(1).every((c) => c.rechargeBefore)).toBe(true)
        // limpet quantities across all cycles sum to the target
        const gathered = plan.cycles.flatMap((c) => c.limpets).reduce((s, l) => s + l.quantity, 0)
        expect(gathered).toBe(500)
    })

    test('cap reasons: hold binds, reserve binds, requested binds', () => {
        const e = entity({
            gatherer_lanes: [gathererLane(0, 700, 1250, 5000)],
            generator: energyStats(60_000, 2),
            energy: 60_000,
        })
        expect(
            buildGatherPlan(e, STRATUM, 'max', {...OPTS, holdRoom: 300, reserveRemaining: 9999}).cap
        ).toBe('hold')
        expect(
            buildGatherPlan(e, STRATUM, 'max', {...OPTS, holdRoom: 9999, reserveRemaining: 200}).cap
        ).toBe('reserve')
        expect(buildGatherPlan(e, STRATUM, {quantity: 50}, OPTS).cap).toBe('requested')
    })

    test('total ETA sums per-cycle recharge + gather seconds', () => {
        const CAP = 40
        const e = entity({
            gatherer_lanes: [gathererLane(0, 700, 1250, 5000)],
            generator: energyStats(CAP, 2),
            energy: CAP,
        })
        const plan = buildGatherPlan(e, STRATUM, {quantity: 500}, OPTS)
        const expected = plan.cycles.reduce((s, c) => s + c.rechargeSeconds + c.gatherSeconds, 0)
        expect(plan.totalSeconds).toBe(expected)
    })

    test('excludes limpets that cannot reach the stratum and warns', () => {
        const e = entity({
            gatherer_lanes: [
                gathererLane(0, 700, 1250, 5000), // reaches 100
                gathererLane(1, 700, 1250, 50), // does not reach 100
            ],
            generator: energyStats(60_000, 2),
            energy: 60_000,
        })
        const plan = buildGatherPlan(e, STRATUM, {quantity: 100}, OPTS)
        expect(plan.cycles[0].limpets).toHaveLength(1)
        expect(plan.cycles[0].limpets[0].slot).toBe(0)
        expect(plan.warnings.some((w) => w.includes("can't reach"))).toBe(true)
    })

    test('reports structured limpet reach counts (all reaching)', () => {
        const e = entity({
            gatherer_lanes: [gathererLane(0, 700, 1250, 5000), gathererLane(1, 700, 1250, 5000)],
            generator: energyStats(60_000, 2),
            energy: 60_000,
        })
        const plan = buildGatherPlan(e, STRATUM, {quantity: 50}, OPTS)
        expect(plan.totalLimpets).toBe(2)
        expect(plan.reachingCount).toBe(2)
    })

    test('reachingCount excludes limpets that cannot reach the stratum', () => {
        const e = entity({
            gatherer_lanes: [
                gathererLane(0, 700, 1250, 5000), // reaches 100
                gathererLane(1, 700, 1250, 50), // does not reach 100
            ],
            generator: energyStats(60_000, 2),
            energy: 60_000,
        })
        const plan = buildGatherPlan(e, STRATUM, {quantity: 50}, OPTS)
        expect(plan.totalLimpets).toBe(2)
        expect(plan.reachingCount).toBe(1)
    })

    test('single-limpet ship still fills across cycles', () => {
        const CAP = 40
        const e = entity({
            gatherer_lanes: [gathererLane(0, 700, 1250, 5000)],
            generator: energyStats(CAP, 2),
            energy: CAP,
        })
        const plan = buildGatherPlan(e, STRATUM, {quantity: 300}, OPTS)
        expect(plan.cycles.every((c) => c.limpets.length === 1)).toBe(true)
        expect(plan.totalOre).toBe(300)
    })

    test('throws when no gatherer reaches the stratum', () => {
        const e = entity({
            gatherer_lanes: [gathererLane(0, 700, 1250, 50)],
            generator: energyStats(1200, 2),
            energy: 1200,
        })
        expect(() => buildGatherPlan(e, STRATUM, 'max', OPTS)).toThrow('no gatherer reaches')
    })

    test('zero fill target yields an empty plan (no cycles)', () => {
        const e = entity({
            gatherer_lanes: [gathererLane(0, 700, 1250, 5000)],
            generator: energyStats(1200, 2),
            energy: 1200,
        })
        const plan = buildGatherPlan(e, STRATUM, 'max', {...OPTS, holdRoom: 0})
        expect(plan.cycleCount).toBe(0)
        expect(plan.totalOre).toBe(0)
        expect(plan.cap).toBe('hold')
    })

    test('first cycle skips recharge when current energy already covers the small batch', () => {
        const e = entity({
            gatherer_lanes: [gathererLane(0, 700, 1250, 5000)],
            generator: energyStats(60_000, 2),
            energy: 60_000, // full
        })
        const plan = buildGatherPlan(e, STRATUM, {quantity: 50}, OPTS)
        expect(plan.cycles[0].rechargeBefore).toBe(false)
        expect(plan.cycles[0].rechargeSeconds).toBe(0)
    })
})
