import {BlockTimestamp, UInt64} from '@wharfkit/antelope'
import {describe, expect, test} from 'bun:test'
import {calc_gather_duration, calc_gather_energy} from '../capabilities/gathering'
import {calc_craft_duration, calc_craft_energy} from '../capabilities/crafting'
import {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
import {
    ITEM_BATTERY_T1,
    ITEM_BATTERY_T2,
    ITEM_CRAFTER_T1,
    ITEM_CRAFTER_T2,
    ITEM_ENGINE_T1,
    ITEM_ENGINE_T2,
    ITEM_GATHERER_T1,
    ITEM_GATHERER_T2,
    ITEM_GENERATOR_T1,
    ITEM_GENERATOR_T2,
    ITEM_HAULER_T1,
    ITEM_HAULER_T2,
    ITEM_STORAGE_T1,
    ITEM_STORAGE_T2,
} from '../data/item-ids'
import items from '../data/items.json'
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
import {
    applyResourceTierMultiplier,
    RESERVE_TIERS,
    rollWithinTier,
    type ReserveTier,
} from '../derivation/tiers'
import {DEPTH_THRESHOLD_T2} from '../derivation/resources'
import type {InstalledModule} from '../entities/slot-multiplier'
import {allocateProportional, maxQtyForCharge, splitCost} from '../planner'
import {
    calc_acceleration,
    calc_energyusage,
    calc_onesided_duration,
    calc_rechargetime,
    calc_travel_flighttime,
    vessel_altitude,
} from '../travel/travel'
import {PRECISION} from '../types'

// The epoch is a startgame parameter (platform.hpp config.epochtime); 446,400 s is the value the register and reserve-regen.test.ts use.
const EPOCH_SECONDS = 446_400
const EPOCH_HOURS = EPOCH_SECONDS / 3600
const DAY_SECONDS = 86_400
const T1_RESOURCE = 101
const MEAN_STAT = 213
const GOOD_STAT = 500
const TIERS: ReserveTier[] = ['small', 'medium', 'large', 'massive', 'motherlode']

const ROUSTABOUT = 10210
const PROSPECTOR_T1 = 10211
const PROSPECTOR_T2A = 11212
const PROSPECTOR_T2B = 11213
const DREDGER = 11214
const TRAWLER = 11225
const SHIP_T1 = 10201
const SMITH_T1 = 10218
const SMITH_T2 = 11224
const ARTISAN = 11228

interface ModuleSet {
    generator: number
    engine: number
    gatherer: number
    storage: number
    hauler: number
    battery: number
    crafter: number
}

const T1: ModuleSet = {
    generator: ITEM_GENERATOR_T1,
    engine: ITEM_ENGINE_T1,
    gatherer: ITEM_GATHERER_T1,
    storage: ITEM_STORAGE_T1,
    hauler: ITEM_HAULER_T1,
    battery: ITEM_BATTERY_T1,
    crafter: ITEM_CRAFTER_T1,
}

const T2: ModuleSet = {
    generator: ITEM_GENERATOR_T2,
    engine: ITEM_ENGINE_T2,
    gatherer: ITEM_GATHERER_T2,
    storage: ITEM_STORAGE_T2,
    hauler: ITEM_HAULER_T2,
    battery: ITEM_BATTERY_T2,
    crafter: ITEM_CRAFTER_T2,
}

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

function starter(stat = MEAN_STAT): Ship {
    return buildShip(ROUSTABOUT, [T1.generator, T1.engine, T1.gatherer], stat)
}

function dredger(stat: number): Ship {
    return buildShip(DREDGER, [T2.generator, T2.engine, T2.gatherer, T2.storage], stat)
}

const lane = (n: number) => ({toNumber: () => n})

function gatherLanes(ship: Ship, stratum: number): any[] {
    return (ship.caps.gathererLanes ?? [])
        .filter((l) => l.depth >= stratum)
        .map((l) => ({
            slot_index: lane(l.slotIndex),
            yield: lane(l.yield),
            drain: lane(l.drain),
            depth: lane(l.depth),
        }))
}

interface Conditions {
    stratum: number
    richness: number
    itemId: number
}

const BASELINE: Conditions = {stratum: 500, richness: 500, itemId: T1_RESOURCE}

interface GatherResult {
    gatherSeconds: number
    rechargeSeconds: number
    energy: number
}

// Mirrors plan_gather_cycle: charge-sized batches, a recharge barrier whenever the batch cost exceeds the energy held.
function gatherPhase(ship: Ship, quantity: number, energyIn: number, c: Conditions): GatherResult {
    const lanes = gatherLanes(ship, c.stratum)
    const gen = ship.caps.generator!
    const mass = getItem(c.itemId).mass
    let energy = energyIn
    let remaining = quantity
    let gatherSeconds = 0
    let rechargeSeconds = 0
    while (remaining > 0) {
        const batch = maxQtyForCharge(lanes, remaining, gen.capacity, c.stratum, mass, c.richness)
        if (batch <= 0) throw new Error('a single gather exceeds one full charge')
        if (energy < splitCost(lanes, batch, c.stratum, mass, c.richness)) {
            rechargeSeconds += Number(calc_rechargetime(gen.capacity, energy, gen.recharge))
            energy = gen.capacity
        }
        const split = allocateProportional(
            lanes.map((l) => ({slot: l.slot_index.toNumber(), weight: l.yield.toNumber()})),
            batch
        ).filter((e) => e.quantity > 0)
        let longest = 0
        let spent = 0
        for (const e of split) {
            const l = lanes.find((x) => x.slot_index.toNumber() === e.slot)
            const duration = Number(
                calc_gather_duration(l, mass, e.quantity, c.stratum, c.richness)
            )
            longest = Math.max(longest, duration)
            spent += Number(calc_gather_energy(l, duration))
        }
        energy = Math.max(0, energy - spent)
        gatherSeconds += longest
        remaining -= batch
    }
    return {gatherSeconds, rechargeSeconds, energy}
}

interface TravelResult {
    flightSeconds: number
    rechargeSeconds: number
    energy: number
}

// Mirrors plan_leg with recharge:true: legs of floor(capacity / drain) tiles, a recharge before any leg that starts below a full charge.
function travelPhase(
    ship: Ship,
    distanceTiles: number,
    cargoUnits: number,
    energyIn: number
): TravelResult {
    const gen = ship.caps.generator!
    const engine = ship.caps.engines!
    const loaderMass = (ship.caps.loaderLanes?.length ?? 0) * 20
    const accel = calc_acceleration(engine.thrust, ship.caps.hullmass + loaderMass + cargoUnits)
    const reach = Math.floor(gen.capacity / engine.drain)
    let left = distanceTiles
    let energy = energyIn
    let flightSeconds = 0
    let rechargeSeconds = 0
    while (left > 0) {
        const leg = Math.min(left, reach)
        const distance = UInt64.from(leg * PRECISION)
        const recharge = Number(calc_rechargetime(gen.capacity, energy, gen.recharge))
        if (recharge > 0) {
            rechargeSeconds += recharge
            energy = gen.capacity
        }
        energy -= Number(calc_energyusage(distance, engine.drain))
        flightSeconds += Number(calc_travel_flighttime(distance, accel))
        left -= leg
    }
    return {flightSeconds, rechargeSeconds, energy}
}

interface LoopResult {
    holdTonnes: number
    loopSeconds: number
    rechargeSeconds: number
    tonnesPerEpoch: number
}

function unloadLoader(stat: number) {
    const caps = computeLoaderCapabilities({hardness: stat, fineness: stat}, 1)
    return {thrust: caps.thrust, payload: caps.payload}
}

const UNLOADER = unloadLoader(MEAN_STAT)

// One mining loop: out empty, a full hold gathered, back loaded, unloaded by a Loader T1 at stat 213 hosted on an orbital structure.
function simulateLoop(ship: Ship, distanceTiles: number, withUnload = true): LoopResult {
    const c = BASELINE
    const mass = getItem(c.itemId).mass
    const holdTonnes = Math.floor(ship.caps.capacity / mass)
    const cargoUnits = holdTonnes * mass
    const unloadSeconds = withUnload
        ? calc_onesided_duration(
              UNLOADER.thrust,
              UNLOADER.payload,
              0,
              vessel_altitude(ship.itemId) ?? 800,
              EntityClass.OrbitalStructure,
              EntityClass.OrbitalVessel,
              cargoUnits
          )
        : 0
    let energy = ship.caps.generator!.capacity
    let last!: LoopResult
    for (let i = 0; i < 4; i++) {
        const out = travelPhase(ship, distanceTiles, 0, energy)
        const gather = gatherPhase(ship, holdTonnes, out.energy, c)
        const back = travelPhase(ship, distanceTiles, cargoUnits, gather.energy)
        energy = back.energy
        const loopSeconds =
            out.flightSeconds +
            out.rechargeSeconds +
            gather.gatherSeconds +
            gather.rechargeSeconds +
            back.flightSeconds +
            back.rechargeSeconds +
            unloadSeconds
        last = {
            holdTonnes,
            loopSeconds,
            rechargeSeconds: out.rechargeSeconds + gather.rechargeSeconds + back.rechargeSeconds,
            tonnesPerEpoch: (holdTonnes * EPOCH_SECONDS) / loopSeconds,
        }
    }
    return last
}

function sustainedGatherRate(ship: Ship, c: Conditions): number {
    const capacity = ship.caps.generator!.capacity
    const warm = gatherPhase(ship, 1, capacity, c)
    const run = gatherPhase(ship, 100_000, warm.energy, c)
    return (100_000 * 3600) / (run.gatherSeconds + run.rechargeSeconds)
}

function gatherRechargeShare(ship: Ship, c: Conditions): number {
    const run = gatherPhase(ship, 100_000, ship.caps.generator!.capacity, c)
    return run.rechargeSeconds / run.gatherSeconds
}

// Recharge seconds per flight second on a trip of many legs, starting from a full charge.
function travelRechargeShare(ship: Ship, loaded: boolean): number {
    const cargo = loaded ? ship.caps.capacity : 0
    const run = travelPhase(ship, 200, cargo, ship.caps.generator!.capacity)
    return run.rechargeSeconds / run.flightSeconds
}

function typedModule(slotType: string, set: ModuleSet): number | null {
    switch (slotType) {
        case 'generator':
            return set.generator
        case 'engine':
            return set.engine
        case 'gatherer':
            return set.gatherer
        case 'storage':
            return set.storage
        case 'hauler':
            return set.hauler
        default:
            return null
    }
}

interface HullEntry {
    name: string
    itemId: number
    bestLoadout: string
    result: LoopResult
}

function gathererShipTemplates(): {itemId: number; kind: string; displayLabel: string}[] {
    return (kindRegistry.templates as {itemId: number; kind: string; displayLabel: string}[])
        .filter((t) => t.kind === 'ship')
        .filter((t) => {
            const slots = getEntityLayout(t.itemId)?.slots ?? []
            return slots.some((s) => s.type === 'gatherer' || s.type === 'any')
        })
}

// Typed slots take the matching module at the slot's tier; 'any' slots search every generator, engine, gatherer, storage and battery mix.
function bestLoadout(itemId: number, stat: number, distanceTiles: number): HullEntry {
    const slots = getEntityLayout(itemId)!.slots
    const set = slots[0].maxTier >= 2 ? T2 : T1
    const anyOptions = [set.generator, set.engine, set.gatherer, set.storage, set.battery]
    const names = new Map<number, string>([
        [set.generator, 'generator'],
        [set.engine, 'engine'],
        [set.gatherer, 'gatherer'],
        [set.storage, 'storage'],
        [set.battery, 'battery'],
    ])
    let best: HullEntry | undefined
    const visit = (index: number, chosen: (number | null)[]) => {
        if (index === slots.length) {
            if (
                !chosen.includes(set.generator) ||
                !chosen.includes(set.engine) ||
                !chosen.includes(set.gatherer)
            )
                return
            const result = simulateLoop(buildShip(itemId, chosen, stat), distanceTiles)
            if (!best || result.tonnesPerEpoch > best.result.tonnesPerEpoch) {
                best = {
                    name: String(itemId),
                    itemId,
                    bestLoadout: chosen.map((c) => (c === null ? 'empty' : names.get(c))).join(','),
                    result,
                }
            }
            return
        }
        if (slots[index].type === 'any') {
            for (const option of anyOptions) visit(index + 1, [...chosen, option])
        } else {
            visit(index + 1, [...chosen, typedModule(slots[index].type, set)])
        }
    }
    visit(0, [])
    return best!
}

const within = (value: number, target: number, fraction: number) =>
    Math.abs(value - target) <= target * fraction

describe('GM-08 gear factor', () => {
    test('WP-GM-08-01 the SDK loop reproduces the register figures within 2%', () => {
        const roustabout = starter()
        const casual = Math.floor(roustabout.caps.capacity / 10) * (EPOCH_SECONDS / DAY_SECONDS)
        expect(Math.abs(casual - 37_852)).toBeLessThan(2)
        expect(within(simulateLoop(roustabout, 10).tonnesPerEpoch, 91_460, 0.02)).toBe(true)
        expect(within(simulateLoop(dredger(GOOD_STAT), 10).tonnesPerEpoch, 340_273, 0.02)).toBe(
            true
        )
    })

    test('WP-GM-08-02 at equal rolls the Dredger T2 gathers about 2.1 to 2.6 times a Roustabout across 1 to 50 tiles', () => {
        for (const stat of [MEAN_STAT, GOOD_STAT]) {
            const ratios = [1, 5, 10, 25, 50].map(
                (d) =>
                    simulateLoop(dredger(stat), d).tonnesPerEpoch /
                    simulateLoop(starter(stat), d).tonnesPerEpoch
            )
            for (const ratio of ratios) {
                expect(ratio).toBeGreaterThan(2.0)
                expect(ratio).toBeLessThan(2.7)
            }
            const atTen = ratios[2]
            expect(atTen).toBeGreaterThan(2.1)
            expect(atTen).toBeLessThan(2.2)
        }
    })

    test('WP-GM-08-03 the 3.7x gear figure needs a stat-500 Dredger against a stat-213 Roustabout', () => {
        const mixed =
            simulateLoop(dredger(GOOD_STAT), 10).tonnesPerEpoch /
            simulateLoop(starter(MEAN_STAT), 10).tonnesPerEpoch
        expect(mixed).toBeGreaterThan(3.6)
        expect(mixed).toBeLessThan(3.9)
        const equalRolls =
            simulateLoop(dredger(GOOD_STAT), 10).tonnesPerEpoch /
            simulateLoop(starter(GOOD_STAT), 10).tonnesPerEpoch
        expect(equalRolls).toBeLessThan(2.2)
    })

    test('WP-GM-08-04 the Dredger leads every craftable gatherer hull on a 10-tile loop', () => {
        for (const stat of [MEAN_STAT, GOOD_STAT]) {
            const craftable = gathererShipTemplates()
                .filter((t) => t.itemId !== SHIP_T1)
                .map((t) => bestLoadout(t.itemId, stat, 10))
            const best = craftable.reduce((a, b) =>
                b.result.tonnesPerEpoch > a.result.tonnesPerEpoch ? b : a
            )
            expect(best.itemId).toBe(DREDGER)
        }
    })
})

function epochSlot(secondsAfterStart: number): BlockTimestamp {
    return BlockTimestamp.fromMilliseconds(Date.UTC(2030, 0, 1) + secondsAfterStart * 1000)
}

function regenPerHour(max: number): number {
    const row = {remaining: 0, max_reserve: max, last_block: epochSlot(0)}
    return getEffectiveReserve(row, epochSlot(3600), EPOCH_SECONDS)
}

function tableTonnesAt(tier: ReserveTier, withinRoll: number): number {
    return rollWithinTier(withinRoll, RESERVE_TIERS[tier], getItem(T1_RESOURCE).mass)
}

function tonnesAt(tier: ReserveTier, withinRoll: number, resourceTier: number): number {
    return applyResourceTierMultiplier(tableTonnesAt(tier, withinRoll), resourceTier)
}

function meanTonnes(tier: ReserveTier, resourceTier: number): number {
    let total = 0
    for (let roll = 0; roll <= 65535; roll++) total += tonnesAt(tier, roll, resourceTier)
    return total / 65536
}

const STARTER_STRATUM_1: Conditions = {stratum: 1, richness: 500, itemId: T1_RESOURCE}

describe('GM-10 deposit regeneration against a starter ship', () => {
    const rate = sustainedGatherRate(starter(), STARTER_STRATUM_1)

    test('WP-GM-10-01 a starter ship sustains about 943 t/h at stratum 1 and richness 500, 3.55 s per tonne', () => {
        expect(rate).toBeGreaterThan(941)
        expect(rate).toBeLessThan(945)
        const ship = starter()
        const duration = Number(
            calc_gather_duration(gatherLanes(ship, 1)[0], getItem(T1_RESOURCE).mass, 1000, 1, 500)
        )
        expect(duration / 1000).toBeGreaterThan(3.54)
        expect(duration / 1000).toBeLessThan(3.56)
    })

    test('WP-GM-10-02 regeneration is linear at max over 124 hours per hour', () => {
        for (const tier of TIERS) {
            for (const max of [RESERVE_TIERS[tier].min / 10, RESERVE_TIERS[tier].max / 10]) {
                expect(Math.abs(regenPerHour(max) - max / EPOCH_HOURS)).toBeLessThanOrEqual(1)
            }
        }
        const drained = {remaining: 0, max_reserve: 50_000, last_block: epochSlot(0)}
        expect(getEffectiveReserve(drained, epochSlot(EPOCH_SECONDS), EPOCH_SECONDS)).toBe(50_000)
    })

    test('WP-GM-10-03 on the table size alone Large regen is 774 to 1,355 t/h and a Large below 117,000 t does not keep up with a starter', () => {
        const large = RESERVE_TIERS.large
        expect(Math.round(large.min / 10 / EPOCH_HOURS)).toBe(774)
        expect(Math.round(large.max / 10 / EPOCH_HOURS)).toBe(1355)
        expect(large.min / 10 / EPOCH_HOURS).toBeLessThan(rate)
        let keepsUp = 0
        for (let roll = 0; roll <= 65535; roll++) {
            if (tableTonnesAt('large', roll) / EPOCH_HOURS >= rate) keepsUp++
        }
        const share = keepsUp / 65536
        expect(share).toBeGreaterThan(0.44)
        expect(share).toBeLessThan(0.48)
    })

    test('WP-GM-10-04 a tier-1 resource carries a 20x multiplier, so every Medium or larger deposit regenerates faster than a starter gathers', () => {
        expect(applyResourceTierMultiplier(1000, 1)).toBe(20_000)
        for (const tier of TIERS.slice(1)) {
            expect(tonnesAt(tier, 0, 1) / EPOCH_HOURS).toBeGreaterThan(rate)
        }
        expect(tonnesAt('small', 0, 1) / EPOCH_HOURS).toBeLessThan(rate)
        expect(meanTonnes('small', 1) / EPOCH_HOURS).toBeGreaterThan(rate)
        expect(tonnesAt('large', 0, 1) / EPOCH_HOURS).toBeGreaterThan(15_000)
    })

    test('WP-GM-10-05 one starter ship cannot empty any tier-1 deposit within an epoch, with regeneration running', () => {
        const drawPerEpoch = rate * EPOCH_HOURS
        for (const tier of TIERS) {
            for (const roll of [0, 65535]) {
                const reserve = tonnesAt(tier, roll, 1)
                expect(2 * reserve).toBeGreaterThan(drawPerEpoch)
            }
        }
    })

    test('WP-GM-10-06 emptying a mean Large tier-1 deposit inside an epoch takes about 40 starter ships', () => {
        const reserve = meanTonnes('large', 1)
        const ships = Math.ceil((2 * reserve) / (rate * EPOCH_HOURS))
        expect(ships).toBeGreaterThan(38)
        expect(ships).toBeLessThan(46)
        expect(rate * EPOCH_HOURS).toBeLessThan(reserve * 0.06)
    })

    test('WP-GM-10-07 a tier-2 resource reaches only strata of 1,500 and deeper, where the starter gathers about 725 t/h', () => {
        const deepest = sustainedGatherRate(starter(), {
            stratum: DEPTH_THRESHOLD_T2,
            richness: 500,
            itemId: 102,
        })
        expect(deepest).toBeGreaterThan(715)
        expect(deepest).toBeLessThan(735)
        expect(applyResourceTierMultiplier(1000, 2)).toBe(15_400)
        expect(2 * tonnesAt('small', 0, 2)).toBeGreaterThan(deepest * EPOCH_HOURS)
    })

    test('WP-GM-10-08 the reserve row has no owner field, so a find is open to every ship', () => {
        const fields = (ServerContract.Types.reserve_row as any).abiFields.map(
            (f: {name: string}) => f.name
        )
        expect(fields).toEqual(['id', 'coord_id', 'stratum', 'remaining', 'last_block'])
    })
})

describe('GM-26 recharge as a share of activity time', () => {
    const gatherHulls: [string, Ship][] = [
        ['Roustabout', starter()],
        [
            'Prospector T1',
            buildShip(PROSPECTOR_T1, [T1.generator, T1.engine, T1.gatherer], MEAN_STAT),
        ],
        [
            'Prospector T2A',
            buildShip(PROSPECTOR_T2A, [T2.generator, T2.engine, T2.gatherer], MEAN_STAT),
        ],
        [
            'Prospector T2B',
            buildShip(PROSPECTOR_T2B, [T2.generator, T2.engine, null, T2.gatherer], MEAN_STAT),
        ],
        ['Dredger', dredger(MEAN_STAT)],
        [
            'Trawler',
            buildShip(TRAWLER, [T2.generator, T2.engine, T2.gatherer, T2.hauler], MEAN_STAT),
        ],
    ]

    test('WP-GM-26-01 gather: recharge is 5.2% to 7.5% of gather time for the starter and T2 gatherer hulls at mean rolls, 2.7% to 3.9% at stat 500', () => {
        const mean = gatherHulls.map(([, ship]) => gatherRechargeShare(ship, BASELINE))
        expect(Math.min(...mean)).toBeGreaterThan(0.051)
        expect(Math.max(...mean)).toBeLessThan(0.075)
        expect(gatherRechargeShare(starter(), BASELINE)).toBeGreaterThan(0.073)
        const good = [
            starter(GOOD_STAT),
            dredger(GOOD_STAT),
            buildShip(PROSPECTOR_T2A, [T2.generator, T2.engine, T2.gatherer], GOOD_STAT),
        ].map((ship) => gatherRechargeShare(ship, BASELINE))
        expect(Math.min(...good)).toBeGreaterThan(0.026)
        expect(Math.max(...good)).toBeLessThan(0.04)
    })

    test('WP-GM-26-02 travel: past one charge of range, recharge is 39% to 75% of flight time empty and 21% to 50% loaded at mean rolls', () => {
        const empty = gatherHulls.map(([, ship]) => travelRechargeShare(ship, false))
        const loaded = gatherHulls.map(([, ship]) => travelRechargeShare(ship, true))
        expect(Math.min(...empty)).toBeGreaterThan(0.38)
        expect(Math.max(...empty)).toBeLessThan(0.76)
        expect(Math.min(...loaded)).toBeGreaterThan(0.2)
        expect(Math.max(...loaded)).toBeLessThan(0.5)
        const roustabout = gatherHulls[0][1]
        expect(travelRechargeShare(roustabout, false)).toBeGreaterThan(0.73)
        expect(travelRechargeShare(roustabout, false)).toBeLessThan(0.76)
    })

    test('WP-GM-26-03 travel: a trip within one charge needs no recharge', () => {
        for (const [, ship] of gatherHulls) {
            const reach = Math.floor(ship.caps.generator!.capacity / ship.caps.engines!.drain)
            const run = travelPhase(ship, reach, 0, ship.caps.generator!.capacity)
            expect(run.rechargeSeconds).toBe(0)
        }
    })

    test('WP-GM-26-04 craft: recharge is 1.3% to 1.5% of craft time for the Smith and Artisan hulls at mean rolls, whatever the recipe mass', () => {
        const crafters: Ship[] = [
            buildShip(SMITH_T1, [T1.generator, T1.engine, T1.crafter], MEAN_STAT),
            buildShip(SMITH_T2, [T2.generator, T2.engine, null, T2.crafter], MEAN_STAT),
            buildShip(ARTISAN, [T2.generator, T2.engine, T2.crafter, T2.storage], MEAN_STAT),
        ]
        const inputMasses = (recipes as {inputs: {itemId: number; quantity: number}[]}[])
            .map((r) => r.inputs.reduce((s, i) => s + getItem(i.itemId).mass * i.quantity, 0))
            .filter((m) => m > 0)
        expect(inputMasses.length).toBeGreaterThan(50)
        const shares: number[] = []
        for (const ship of crafters) {
            const crafter = ship.caps.crafter!
            const recharge = ship.caps.generator!.recharge
            for (const mass of inputMasses) {
                const duration = Number(calc_craft_duration(crafter.speed, mass))
                const energy = Number(calc_craft_energy(crafter.drain, mass))
                shares.push(energy / recharge / duration)
            }
        }
        expect(Math.min(...shares)).toBeGreaterThan(0.013)
        expect(Math.max(...shares)).toBeLessThan(0.0153)
    })

    test('WP-GM-26-05 a 10-tile mining loop spends 6% to 12% of its time recharging at mean rolls', () => {
        for (const [, ship] of gatherHulls) {
            const loop = simulateLoop(ship, 10)
            const share = loop.rechargeSeconds / loop.loopSeconds
            expect(share).toBeGreaterThan(0.058)
            expect(share).toBeLessThan(0.12)
        }
    })

    test('WP-GM-26-06 no catalog item or resource category is named for energy', () => {
        const entries = items as {type: string; category?: string}[]
        const labels = new Set(entries.flatMap((i) => [i.type, i.category ?? '']))
        expect([...labels].some((label) => /energy|fuel/i.test(label))).toBe(false)
    })
})
