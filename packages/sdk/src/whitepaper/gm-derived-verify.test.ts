import {BlockTimestamp, UInt16, UInt32, UInt8} from '@wharfkit/antelope'
import {describe, expect, test} from 'bun:test'
import {calc_craft_duration, calc_craft_energy} from '../capabilities/crafting'
import {calc_gather_energy} from '../capabilities/gathering'
import {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
import {
    ITEM_BATTERY_T2,
    ITEM_CRAFTER_T1,
    ITEM_ENGINE_T1,
    ITEM_ENGINE_T2,
    ITEM_GATHERER_T1,
    ITEM_GATHERER_T2,
    ITEM_GENERATOR_T1,
    ITEM_GENERATOR_T2,
    ITEM_HAULER_T2,
    ITEM_STORAGE_T2,
} from '../data/item-ids'
import kindRegistry from '../data/kind-registry.json'
import recipes from '../data/recipes.json'
import {EntityClass} from '../data/kind-registry'
import {getEntityLayout} from '../data/recipes-runtime'
import {
    computeEntityCapabilities,
    computeLoaderCapabilities,
    type ComputedCapabilities,
} from '../derivation/capabilities'
import {encodeStats} from '../derivation/crafting'
import {getEffectiveReserve} from '../derivation/reserve-regen'
import {applyResourceTierMultiplier, RESERVE_TIERS, rollWithinTier} from '../derivation/tiers'
import type {InstalledModule} from '../entities/slot-multiplier'
import {buildGatherPlan} from '../planner'
import {simulateRoute} from '../travel/route-simulator'
import {calc_onesided_duration, vessel_altitude} from '../travel/travel'

const EPOCH_SECONDS = 446_400
const T1_RESOURCE = 101
const MEAN_STAT = 213
const GOOD_STAT = 500
const ROUSTABOUT = 10210
const SHIP_T1 = 10201
const PROSPECTOR_T1 = 10211
const PROSPECTOR_T2A = 11212
const PROSPECTOR_T2B = 11213
const DREDGER = 11214
const TRAWLER = 11225
const SMITH_T1 = 10218

interface Ship {
    itemId: number
    caps: ComputedCapabilities
}

function buildShip(itemId: number, slotItems: (number | null)[], stat: number): Ship {
    const layout = getEntityLayout(itemId)!.slots
    const moduleStats = encodeStats([stat, stat, stat, stat, stat, stat])
    const modules: InstalledModule[] = []
    slotItems.forEach((moduleItem, slotIndex) => {
        if (moduleItem !== null) modules.push({slotIndex, itemId: moduleItem, stats: moduleStats})
    })
    const hullStats = {a: stat, b: stat, c: stat, d: stat, e: stat}
    return {itemId, caps: computeEntityCapabilities(hullStats, itemId, modules, layout)}
}

const roustabout = (stat: number) =>
    buildShip(ROUSTABOUT, [ITEM_GENERATOR_T1, ITEM_ENGINE_T1, ITEM_GATHERER_T1], stat)
const dredger = (stat: number) =>
    buildShip(DREDGER, [ITEM_GENERATOR_T2, ITEM_ENGINE_T2, ITEM_GATHERER_T2, ITEM_STORAGE_T2], stat)
const prospectorT2B = (stat: number, aux: number | null) =>
    buildShip(PROSPECTOR_T2B, [ITEM_GENERATOR_T2, ITEM_ENGINE_T2, aux, ITEM_GATHERER_T2], stat)

function craftableGatherers(stat: number): [string, Ship][] {
    return [
        ['Roustabout', roustabout(stat)],
        [
            'Prospector T1',
            buildShip(PROSPECTOR_T1, [ITEM_GENERATOR_T1, ITEM_ENGINE_T1, ITEM_GATHERER_T1], stat),
        ],
        [
            'Prospector T2A',
            buildShip(PROSPECTOR_T2A, [ITEM_GENERATOR_T2, ITEM_ENGINE_T2, ITEM_GATHERER_T2], stat),
        ],
        ['Prospector T2B empty aux', prospectorT2B(stat, null)],
        ['Prospector T2B aux generator', prospectorT2B(stat, ITEM_GENERATOR_T2)],
        ['Prospector T2B aux engine', prospectorT2B(stat, ITEM_ENGINE_T2)],
        ['Prospector T2B aux battery', prospectorT2B(stat, ITEM_BATTERY_T2)],
        [
            'Trawler',
            buildShip(
                TRAWLER,
                [ITEM_GENERATOR_T2, ITEM_ENGINE_T2, ITEM_GATHERER_T2, ITEM_HAULER_T2],
                stat
            ),
        ],
        ['Dredger', dredger(stat)],
    ]
}

function gatherEntity(ship: Ship, energy: number): any {
    const gen = ship.caps.generator!
    return {
        coordinates: {x: 0, y: 0},
        energy: UInt32.from(energy),
        hullmass: UInt32.from(ship.caps.hullmass),
        capacity: UInt32.from(ship.caps.capacity),
        generator: ServerContract.Types.energy_stats.from({
            capacity: gen.capacity,
            recharge: gen.recharge,
        }),
        engines: ServerContract.Types.movement_stats.from({
            thrust: ship.caps.engines!.thrust,
            drain: ship.caps.engines!.drain,
        }),
        loader_lanes: [],
        gatherer_lanes: (ship.caps.gathererLanes ?? []).map((l) =>
            ServerContract.Types.gatherer_lane.from({
                slot_index: UInt8.from(l.slotIndex),
                yield: UInt16.from(l.yield),
                drain: UInt32.from(l.drain),
                depth: UInt16.from(l.depth),
                output_pct: UInt16.from(l.outputPct),
            })
        ),
        hauler: null,
        launcher: null,
        cargo: [],
        cargomass: UInt32.from(0),
        lanes: [],
        holds: [],
    }
}

interface Ground {
    stratum: number
    richness: number
}

const BASELINE: Ground = {stratum: 500, richness: 500}

function sdkGather(ship: Ship, quantity: number, energy: number, g: Ground) {
    const plan = buildGatherPlan(
        gatherEntity(ship, energy),
        g.stratum,
        {quantity},
        {
            richness: g.richness,
            itemMass: getItem(T1_RESOURCE).mass,
            holdRoom: Number.MAX_SAFE_INTEGER,
            reserveRemaining: Number.MAX_SAFE_INTEGER,
            now: new Date(0),
        }
    )
    expect(plan.totalOre).toBe(quantity)
    const gen = ship.caps.generator!
    let e = energy
    let recharge = 0
    let gather = 0
    for (const c of plan.cycles) {
        if (c.rechargeBefore) e = gen.capacity
        recharge += c.rechargeSeconds
        gather += c.gatherSeconds
        const lanes = gatherEntity(ship, 0).gatherer_lanes
        for (const l of c.limpets) {
            const lane = lanes.find((x: any) => x.slot_index.toNumber() === l.slot)
            e -= Number(calc_gather_energy(lane, l.durationSeconds))
        }
        e = Math.max(0, e)
    }
    return {gatherSeconds: gather, rechargeSeconds: recharge, energy: e}
}

function sdkRoute(ship: Ship, legsTiles: number[], cargoMass: number, energy: number) {
    const gen = ship.caps.generator!
    const engine = ship.caps.engines!
    const waypoints: {x: number; y: number}[] = []
    let x = 0
    for (const leg of legsTiles) {
        x += leg
        waypoints.push({x, y: 0})
    }
    const sim = simulateRoute(
        [
            {
                ref: {entityType: 'ship', entityId: 1},
                hasMovement: true,
                engines: {thrust: engine.thrust, drain: engine.drain},
                generator: {capacity: gen.capacity, recharge: gen.recharge},
                mass: ship.caps.hullmass + cargoMass,
                energy,
                priorMobilityEnd: 0,
                narrowBarrierEnd: 0,
            },
        ],
        waypoints,
        {x: 0, y: 0},
        true
    )
    expect(sim.reachable).toBe(true)
    const flight = sim.legs.reduce((s, l) => s + l.flightSeconds, 0)
    const recharge = sim.legs.reduce((s, l) => s + l.rechargeSeconds, 0)
    let end = energy
    sim.legs.forEach((l) => {
        if (l.rechargeBefore) end = gen.capacity
        end = Math.max(0, end - l.energyCostByMover['1'])
    })
    return {flightSeconds: flight, rechargeSeconds: recharge, energy: end}
}

function maxLegs(ship: Ship, tiles: number): number[] {
    const reach = Math.floor(ship.caps.generator!.capacity / ship.caps.engines!.drain)
    const legs: number[] = []
    let left = tiles
    while (left > 0) {
        legs.push(Math.min(reach, left))
        left -= Math.min(reach, left)
    }
    return legs
}

const UNLOADER = computeLoaderCapabilities({hardness: MEAN_STAT, fineness: MEAN_STAT}, 1)

function sdkLoop(ship: Ship, tiles: number, g: Ground = BASELINE, epochSeconds = EPOCH_SECONDS) {
    const mass = getItem(T1_RESOURCE).mass
    const hold = Math.floor(ship.caps.capacity / mass)
    const cargo = hold * mass
    const unload = calc_onesided_duration(
        UNLOADER.thrust,
        UNLOADER.payload,
        0,
        vessel_altitude(ship.itemId) ?? 800,
        EntityClass.OrbitalStructure,
        EntityClass.OrbitalVessel,
        cargo
    )
    let energy = ship.caps.generator!.capacity
    let result = {loopSeconds: 0, rechargeSeconds: 0, tonnesPerEpoch: 0}
    for (let i = 0; i < 4; i++) {
        const out = sdkRoute(ship, maxLegs(ship, tiles), 0, energy)
        const gather = sdkGather(ship, hold, out.energy, g)
        const back = sdkRoute(ship, maxLegs(ship, tiles), cargo, gather.energy)
        energy = back.energy
        const loopSeconds =
            out.flightSeconds +
            out.rechargeSeconds +
            gather.gatherSeconds +
            gather.rechargeSeconds +
            back.flightSeconds +
            back.rechargeSeconds +
            unload
        result = {
            loopSeconds,
            rechargeSeconds: out.rechargeSeconds + gather.rechargeSeconds + back.rechargeSeconds,
            tonnesPerEpoch: (hold * epochSeconds) / loopSeconds,
        }
    }
    return result
}

const within = (value: number, target: number, fraction: number) =>
    Math.abs(value - target) <= target * fraction

describe('GM-08 verify', () => {
    test("WP-GM-08-V01 the SDK's own planners (buildGatherPlan, simulateRoute) reproduce the challenger's loop figures", () => {
        expect(within(sdkLoop(roustabout(MEAN_STAT), 10).tonnesPerEpoch, 90_383, 0.005)).toBe(true)
        expect(within(sdkLoop(dredger(MEAN_STAT), 10).tonnesPerEpoch, 196_176, 0.005)).toBe(true)
        expect(within(sdkLoop(dredger(GOOD_STAT), 10).tonnesPerEpoch, 337_537, 0.005)).toBe(true)
        expect(within(sdkLoop(roustabout(GOOD_STAT), 10).tonnesPerEpoch, 158_415, 0.005)).toBe(true)
    })

    test('WP-GM-08-V02 the generic Ship T1 has no recipe, so no shipped hull carries three Gatherers', () => {
        const outputs = new Set((recipes as {outputItemId: number}[]).map((r) => r.outputItemId))
        expect(outputs.has(SHIP_T1)).toBe(false)
        const ships = (kindRegistry.templates as {itemId: number; kind: string}[]).filter(
            (t) => t.kind === 'ship' && outputs.has(t.itemId)
        )
        expect(ships.length).toBeGreaterThan(20)
        for (const t of ships) {
            const gathererSlots = getEntityLayout(t.itemId)!.slots.filter(
                (s) => s.type === 'gatherer' || s.type === 'any'
            )
            expect(gathererSlots.length).toBeLessThanOrEqual(1)
        }
    })

    test('WP-GM-08-V03 the Dredger leads every craftable gatherer fit, aux options included, on loops of 1 to 50 tiles', () => {
        for (const stat of [MEAN_STAT, GOOD_STAT]) {
            for (const tiles of [1, 5, 10, 25, 50]) {
                const rows = craftableGatherers(stat).map(
                    ([name, ship]) => [name, sdkLoop(ship, tiles).tonnesPerEpoch] as const
                )
                const best = rows.reduce((a, b) => (b[1] > a[1] ? b : a))
                expect(best[0]).toBe('Dredger')
            }
        }
    })

    test('WP-GM-08-V04 at equal rolls the Dredger over the Roustabout stays within 2.0x to 2.7x at strata 1 and 1,000 and richness 400 to 600', () => {
        for (const g of [
            {stratum: 1, richness: 500},
            {stratum: 1000, richness: 500},
            {stratum: 500, richness: 400},
            {stratum: 500, richness: 600},
        ]) {
            for (const stat of [MEAN_STAT, GOOD_STAT]) {
                const ratio =
                    sdkLoop(dredger(stat), 10, g).tonnesPerEpoch /
                    sdkLoop(roustabout(stat), 10, g).tonnesPerEpoch
                expect(ratio).toBeGreaterThan(2.0)
                expect(ratio).toBeLessThan(2.7)
            }
        }
    })

    test('WP-GM-08-V05 the ratio is independent of epoch length while the tonnage scales with it', () => {
        const short = sdkLoop(dredger(MEAN_STAT), 10, BASELINE, 86_400)
        const long = sdkLoop(dredger(MEAN_STAT), 10, BASELINE, EPOCH_SECONDS)
        expect(long.tonnesPerEpoch / short.tonnesPerEpoch).toBeCloseTo(EPOCH_SECONDS / 86_400, 6)
    })
})

function slot(seconds: number): BlockTimestamp {
    return BlockTimestamp.fromMilliseconds(Date.UTC(2030, 0, 1) + seconds * 1000)
}

function sustainedRate(ship: Ship, g: Ground): number {
    const warm = sdkGather(ship, 1, ship.caps.generator!.capacity, g)
    const run = sdkGather(ship, 100_000, warm.energy, g)
    return (100_000 * 3600) / (run.gatherSeconds + run.rechargeSeconds)
}

function drainsWithinEpoch(reserve: number, ratePerHour: number, epochSeconds: number): boolean {
    let remaining = reserve
    let last = slot(0)
    for (let hour = 1; hour * 3600 <= epochSeconds; hour++) {
        const now = slot(hour * 3600)
        const effective = getEffectiveReserve(
            {remaining, max_reserve: reserve, last_block: last},
            now,
            epochSeconds
        )
        remaining = Math.max(0, effective - Math.round(ratePerHour))
        last = now
        if (remaining === 0) return true
    }
    return false
}

const smallestT1 = (tier: 'small' | 'medium') =>
    applyResourceTierMultiplier(
        rollWithinTier(0, RESERVE_TIERS[tier], getItem(T1_RESOURCE).mass),
        1
    )

describe('GM-10 verify', () => {
    test('WP-GM-10-V01 a starter on a rich stratum empties the smallest tier 1 Small deposit inside a 124-hour epoch', () => {
        const small = smallestT1('small')
        expect(small).toBe(72_000)
        const at500 = sustainedRate(roustabout(MEAN_STAT), {stratum: 1, richness: 500})
        expect(drainsWithinEpoch(small, at500, EPOCH_SECONDS)).toBe(false)
        let threshold = 0
        for (let richness = 500; richness <= 999; richness += 5) {
            const rate = sustainedRate(roustabout(MEAN_STAT), {stratum: 1, richness})
            if (drainsWithinEpoch(small, rate, EPOCH_SECONDS)) {
                threshold = richness
                break
            }
        }
        expect(threshold).toBeGreaterThanOrEqual(610)
        expect(threshold).toBeLessThanOrEqual(620)
    })

    test('WP-GM-10-V02 at a 168-hour epoch a mean-richness starter empties the smallest tier 1 Small deposit', () => {
        const small = smallestT1('small')
        const rate = sustainedRate(roustabout(MEAN_STAT), {stratum: 1, richness: 500})
        expect(drainsWithinEpoch(small, rate, 168 * 3600)).toBe(true)
        expect(drainsWithinEpoch(small, rate, EPOCH_SECONDS)).toBe(false)
    })

    test('WP-GM-10-V03 every tier 1 Medium or larger deposit out-regenerates a starter at richness 999 and at a 168-hour epoch', () => {
        const rate = sustainedRate(roustabout(MEAN_STAT), {stratum: 1, richness: 999})
        expect(rate).toBeGreaterThan(1800)
        for (const epochSeconds of [EPOCH_SECONDS, 168 * 3600]) {
            const regenPerHour = smallestT1('medium') / (epochSeconds / 3600)
            expect(regenPerHour).toBeGreaterThan(rate)
        }
    })
})

describe('GM-26 verify', () => {
    const share = (ship: Ship, legs: number[], loaded: boolean) => {
        const run = sdkRoute(
            ship,
            legs,
            loaded ? ship.caps.capacity : 0,
            ship.caps.generator!.capacity
        )
        return run.rechargeSeconds / run.flightSeconds
    }

    test('WP-GM-26-V01 simulateRoute reproduces the 200-tile shares: Roustabout empty 73% to 76%', () => {
        const r = roustabout(MEAN_STAT)
        const s = share(r, maxLegs(r, 200), false)
        expect(s).toBeGreaterThan(0.73)
        expect(s).toBeLessThan(0.76)
    })

    test('WP-GM-26-V02 a two-leg trip recharges about half the many-leg share, under the proposed 40% floor', () => {
        const r = roustabout(MEAN_STAT)
        const twoLegs = share(r, maxLegs(r, 10), false)
        expect(twoLegs).toBeLessThan(0.4)
        const d = dredger(MEAN_STAT)
        const dTwo = share(d, maxLegs(d, 2 * maxLegs(d, 100)[0]), false)
        expect(dTwo).toBeLessThan(0.25)
    })

    test('WP-GM-26-V03 as a share of total travel time, recharge is 28% to 43% empty over 200 tiles', () => {
        const values = craftableGatherers(MEAN_STAT)
            .filter(([name]) => !name.includes('aux ') || name.includes('empty'))
            .map(([, ship]) => {
                const s = share(ship, maxLegs(ship, 200), false)
                return s / (1 + s)
            })
        expect(Math.min(...values)).toBeGreaterThan(0.27)
        expect(Math.max(...values)).toBeLessThan(0.44)
    })

    test('WP-GM-26-V04 one-tile hops lower the share, so the many-leg figure is the maximum-leg case', () => {
        const r = roustabout(MEAN_STAT)
        const hops = share(r, Array(200).fill(1), false)
        const long = share(r, maxLegs(r, 200), false)
        expect(hops).toBeLessThan(long)
    })

    test('WP-GM-26-V05 a Prospector T2B with a second Generator in its aux slot falls outside both proposed ranges', () => {
        const ship = prospectorT2B(MEAN_STAT, ITEM_GENERATOR_T2)
        const run = sdkGather(ship, 100_000, ship.caps.generator!.capacity, BASELINE)
        expect(run.rechargeSeconds / run.gatherSeconds).toBeLessThan(0.03)
        expect(share(ship, maxLegs(ship, 200), false)).toBeLessThan(0.25)
        const plain = prospectorT2B(MEAN_STAT, null)
        const base = sdkGather(plain, 100_000, plain.caps.generator!.capacity, BASELINE)
        expect(base.rechargeSeconds / base.gatherSeconds).toBeGreaterThan(0.05)
        expect(share(plain, maxLegs(plain, 200), false)).toBeGreaterThan(0.39)
    })

    test('WP-GM-26-V06 the gather share is the same at strata 1 and 1,400 and richness 300 to 700', () => {
        const r = roustabout(MEAN_STAT)
        const shares = [
            {stratum: 1, richness: 300},
            {stratum: 1, richness: 700},
            {stratum: 1400, richness: 500},
        ].map((g) => {
            const run = sdkGather(r, 100_000, r.caps.generator!.capacity, g)
            return run.rechargeSeconds / run.gatherSeconds
        })
        for (const s of shares) {
            expect(s).toBeGreaterThan(0.07)
            expect(s).toBeLessThan(0.08)
        }
    })

    test('WP-GM-26-V07 craft share at stat 500 stays near 1.3% to 1.5%', () => {
        const ship = buildShip(
            SMITH_T1,
            [ITEM_GENERATOR_T1, ITEM_ENGINE_T1, ITEM_CRAFTER_T1],
            GOOD_STAT
        )
        const crafter = ship.caps.crafter!
        const recharge = ship.caps.generator!.recharge
        const shares = (recipes as {inputs: {itemId: number; quantity: number}[]}[])
            .map((r) => r.inputs.reduce((s, i) => s + getItem(i.itemId).mass * i.quantity, 0))
            .filter((m) => m > 0)
            .map(
                (m) =>
                    Number(calc_craft_energy(crafter.drain, m)) /
                    recharge /
                    Number(calc_craft_duration(crafter.speed, m))
            )
        expect(Math.min(...shares)).toBeGreaterThan(0.013)
        expect(Math.max(...shares)).toBeLessThan(0.015)
    })

    test('WP-GM-26-V08 the only energy action is the self-recharge, and cargo and wrapped items carry no energy', () => {
        const abi = ServerContract.abi
        const names = abi.actions.map((a) => String(a.name))
        expect(names.filter((n) => /energy|charge|fuel|power|battery/i.test(n))).toEqual([
            'recharge',
        ])
        const recharge = abi.structs.find((s) => s.name === 'recharge')!
        expect(recharge.fields.map((f) => f.name)).toEqual(['id'])
        for (const name of ['cargo_item', 'nft_cargo_item', 'packed_module']) {
            const struct = abi.structs.find((s) => s.name === name)!
            expect(struct.fields.some((f) => /energy/i.test(f.name))).toBe(false)
        }
        const rowsWithEnergy = abi.structs
            .filter((s) => s.name.endsWith('_row'))
            .filter((s) => s.fields.some((f) => f.name === 'energy'))
            .map((s) => s.name)
        expect(rowsWithEnergy).toEqual(['entity_row'])
    })
})
