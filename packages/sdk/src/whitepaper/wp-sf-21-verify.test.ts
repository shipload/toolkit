import {UInt16, UInt32, UInt8} from '@wharfkit/antelope'
import {describe, expect, test} from 'bun:test'
import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {calc_craft_duration} from '../capabilities/crafting'
import {calc_gather_energy} from '../capabilities/gathering'
import {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
import {
    ITEM_BUILDER_T1,
    ITEM_CRAFTER_T1,
    ITEM_ENGINE_T1,
    ITEM_GATHERER_T1,
    ITEM_GENERATOR_T1,
    ITEM_HAULER_T1,
    ITEM_LOADER_T1,
    ITEM_STORAGE_T1,
    ITEM_WARP_T1,
} from '../data/item-ids'
import kindRegistry from '../data/kind-registry.json'
import recipes from '../data/recipes.json'
import {EntityClass} from '../data/kind-registry'
import {getEntityLayout} from '../data/recipes-runtime'
import {
    computeEntityCapabilities,
    computeLoaderCapabilities,
    computeModuleCapabilities,
    type ComputedCapabilities,
} from '../derivation/capabilities'
import {encodeStats} from '../derivation/crafting'
import type {InstalledModule} from '../entities/slot-multiplier'
import {buildGatherPlan} from '../planner'
import {simulateRoute} from '../travel/route-simulator'
import {calc_onesided_duration, vessel_altitude} from '../travel/travel'
import {CRAFT_ENERGY_DIVISOR, MASS_STAT_SCALE} from '../types'

const EPOCH_SECONDS = 446_400
const T1_RESOURCE = 101
const MEAN_STAT = 213
const GOOD_STAT = 500
const SHIP_T1 = 10201
const ROUSTABOUT = 10210
const PROSPECTOR_T1 = 10211
const TENDER_T1 = 10212
const WRIGHT_T1 = 10213
const TUG_T1 = 10214
const PORTER_T1 = 10215
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

const G = ITEM_GENERATOR_T1
const E = ITEM_ENGINE_T1
const roustabout = (stat: number, moduleItem: number) =>
    buildShip(ROUSTABOUT, [G, E, moduleItem], stat)
const specialist = (itemId: number, stat: number, moduleItem: number) =>
    buildShip(itemId, [G, E, moduleItem], stat)
const shipT1 = (stat: number, modules: number[]) => buildShip(SHIP_T1, modules, stat)

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

const GROUND = {stratum: 500, richness: 500}

function sdkGather(ship: Ship, quantity: number, energy: number) {
    const plan = buildGatherPlan(
        gatherEntity(ship, energy),
        GROUND.stratum,
        {quantity},
        {
            richness: GROUND.richness,
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

const UNLOADER = computeLoaderCapabilities({insulation: MEAN_STAT, plasticity: MEAN_STAT}, 1)

function tonnesPerEpoch(ship: Ship, tiles: number) {
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
    let rate = 0
    for (let i = 0; i < 4; i++) {
        const out = sdkRoute(ship, maxLegs(ship, tiles), 0, energy)
        const gather = sdkGather(ship, hold, out.energy)
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
        rate = (hold * EPOCH_SECONDS) / loopSeconds
    }
    return rate
}

// Sustained mass crafted per hour: each full battery crafts a fixed mass (energy per craft ignores speed), the lanes then share the crafting time, and the recharge follows.
function sustainedCraftMassPerHour(ship: Ship): number {
    const gen = ship.caps.generator!
    const lanes = ship.caps.crafterLanes!
    const drain = lanes[0].drain
    const speed = lanes.reduce((s, l) => s + l.speed, 0)
    const massPerBattery = (gen.capacity * CRAFT_ENERGY_DIVISOR) / drain
    const craftSeconds = (massPerBattery * MASS_STAT_SCALE) / speed
    const rechargeSeconds = gen.capacity / gen.recharge
    return (massPerBattery * 3600) / (craftSeconds + rechargeSeconds)
}

const stats = (v: number) => encodeStats([v, v, v, v, v, v])
const STATS = [50, 213, 500, 800, 999]
const LOOPS = [1, 10, 50, 150]

describe('SF-21 verifier', () => {
    test('WP-SF-21-V01 a module in the Roustabout socket outputs 60% of the typed output across the stat range, within rounding, on every role', () => {
        const roles: [number, (c: any) => number][] = [
            [ITEM_GATHERER_T1, (c) => c.yield],
            [ITEM_CRAFTER_T1, (c) => c.speed],
            [ITEM_BUILDER_T1, (c) => c.speed],
            [ITEM_LOADER_T1, (c) => c.thrust],
            [ITEM_STORAGE_T1, (c) => c.capacity],
            [ITEM_HAULER_T1, (c) => c.efficiency],
        ]
        for (const stat of STATS)
            for (const [item, pick] of roles) {
                const typed = pick(computeModuleCapabilities(item, stats(stat), 100)!)
                const rous = pick(computeModuleCapabilities(item, stats(stat), 60)!)
                if (typed <= 1) {
                    expect(rous).toBe(typed)
                    continue
                }
                expect(rous / typed, `item ${item} stat ${stat}`).toBeGreaterThan(0.57)
                expect(rous / typed).toBeLessThanOrEqual(0.6)
            }
    })

    test('WP-SF-21-V02 the Roustabout gatherer earns 60% to 78% of a Prospector T1 on loops of 1 to 50 tiles, and the ratio climbs with distance, passing 80% by 150 tiles and staying below 100%', () => {
        const ratio = (stat: number, tiles: number) =>
            tonnesPerEpoch(roustabout(stat, ITEM_GATHERER_T1), tiles) /
            tonnesPerEpoch(specialist(PROSPECTOR_T1, stat, ITEM_GATHERER_T1), tiles)
        let lo = Infinity
        let hi = 0
        for (const stat of STATS) {
            let prev = 0
            for (const tiles of [1, 10, 50, 150, 500]) {
                const r = ratio(stat, tiles)
                console.log(`WP-SF-21-V02 stat ${stat} tiles ${tiles} ratio ${r.toFixed(3)}`)
                expect(r).toBeGreaterThan(prev)
                expect(r).toBeLessThan(1)
                prev = r
                if (tiles <= 50) {
                    lo = Math.min(lo, r)
                    hi = Math.max(hi, r)
                }
                if (tiles === 150) expect(r).toBeGreaterThan(0.8)
            }
        }
        expect(lo).toBeGreaterThan(0.6)
        expect(hi).toBeLessThan(0.78)
    })

    test('WP-SF-21-V03 the Roustabout crafter sustains between 55% and 62% of a Smith T1 at equal rolls across stats', () => {
        let lo = Infinity
        let hi = 0
        for (const stat of STATS) {
            const r =
                sustainedCraftMassPerHour(roustabout(stat, ITEM_CRAFTER_T1)) /
                sustainedCraftMassPerHour(specialist(SMITH_T1, stat, ITEM_CRAFTER_T1))
            lo = Math.min(lo, r)
            hi = Math.max(hi, r)
        }
        console.log(`WP-SF-21-V03 crafter ratio range ${lo.toFixed(3)} to ${hi.toFixed(3)}`)
        expect(lo).toBeGreaterThan(0.55)
        expect(hi).toBeLessThan(0.62)
    })

    test('WP-SF-21-V04 the claim needs equal rolls: a well-rolled Roustabout gatherer out-earns a poorly rolled Prospector T1', () => {
        const strong = tonnesPerEpoch(roustabout(800, ITEM_GATHERER_T1), 10)
        const weak = tonnesPerEpoch(specialist(PROSPECTOR_T1, 213, ITEM_GATHERER_T1), 10)
        console.log(`WP-SF-21-V04 strong roustabout / weak prospector ${(strong / weak).toFixed(3)}`)
        expect(strong).toBeGreaterThan(weak)
    })

    test('WP-SF-21-V05 per ship the generalist earns less, but a Prospector T1 recipe consumes a Roustabout plus another 750 components, so per component the Roustabout earns more', () => {
        const rows = recipes as {outputItemId: number; inputs: {itemId: number; quantity: number}[]}[]
        const count = (id: number) =>
            rows.find((r) => r.outputItemId === id)!.inputs.reduce((n, i) => n + i.quantity, 0)
        expect(rows.find((r) => r.outputItemId === PROSPECTOR_T1)!.inputs.some((i) => i.itemId === ROUSTABOUT)).toBe(true)
        const rousCost = count(ROUSTABOUT)
        const prospectorCost = rousCost + count(PROSPECTOR_T1) - 1
        expect(prospectorCost).toBeGreaterThan(rousCost)
        const ratio =
            tonnesPerEpoch(roustabout(500, ITEM_GATHERER_T1), 50) /
            tonnesPerEpoch(specialist(PROSPECTOR_T1, 500, ITEM_GATHERER_T1), 50)
        expect(ratio).toBeLessThan(1)
        expect(ratio * (prospectorCost / rousCost)).toBeGreaterThan(1)
    })

    test('WP-SF-21-V06 the universal sockets accept tier 1 modules only and the contract admits a mismatched module only into MODULE_ANY', () => {
        for (const hull of [SHIP_T1, ROUSTABOUT])
            for (const s of getEntityLayout(hull)!.slots.filter((x) => x.type === 'any'))
                expect(s.maxTier).toBe(1)
        const base = join(import.meta.dir, '../../../../../contracts/src/server')
        const crafting = readFileSync(join(base, 'include/server/crafting.hpp'), 'utf8')
        expect(crafting).toContain('slot_type == MODULE_ANY || slot_type == module_type')
        const registry = readFileSync(join(base, 'include/server/kind_registry.hpp'), 'utf8')
        expect([...registry.matchAll(/MODULE_ANY,/g)].length).toBe(6)
    })

    test('WP-SF-21-V07 the starter hull is the Roustabout and production source outside the item tables never names the Ship T1', () => {
        const base = join(import.meta.dir, '../../../../../contracts/src/server')
        expect(readFileSync(join(base, 'include/server/starter.hpp'), 'utf8')).toContain(
            'STARTER_SHIP_ITEM = ITEM_ROUSTABOUT_T1A_PACKED'
        )
        const hits: string[] = []
        const walk = (dir: string) => {
            for (const e of readdirSync(dir, {withFileTypes: true})) {
                const p = join(dir, e.name)
                if (e.isDirectory()) {
                    if (e.name !== 'build' && e.name !== 'debug') walk(p)
                } else if (/\.(cpp|hpp)$/.test(e.name)) {
                    if (readFileSync(p, 'utf8').includes('ITEM_SHIP_T1_PACKED')) hits.push(e.name)
                }
            }
        }
        walk(join(base, 'src'))
        walk(join(base, 'include'))
        expect(hits.sort()).toEqual(['items.cpp', 'items.hpp', 'kind_registry.hpp', 'wrapped_schema.hpp'])
    })
})
