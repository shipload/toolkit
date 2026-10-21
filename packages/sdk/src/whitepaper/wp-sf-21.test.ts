import {UInt16, UInt32, UInt8} from '@wharfkit/antelope'
import {describe, expect, test} from 'bun:test'
import {existsSync, readFileSync} from 'node:fs'
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

describe('SF-21 slot table', () => {
    test('WP-SF-21-01 only the Ship T1 and the Roustabout carry universal sockets, at 80% and 60%, and every typed socket on a shipped hull is at or above 80%', () => {
        const universal = (kindRegistry.templates as {itemId: number; kind: string}[])
            .map((t) => [t.itemId, getEntityLayout(t.itemId)!.slots] as const)
            .filter(([, slots]) => slots.some((s) => s.type === 'any'))
        expect(universal.map(([id]) => id).sort()).toEqual([SHIP_T1, ROUSTABOUT])
        expect(getEntityLayout(SHIP_T1)!.slots.map((s) => [s.type, s.outputPct])).toEqual(
            Array(5).fill(['any', 80])
        )
        expect(getEntityLayout(ROUSTABOUT)!.slots.map((s) => [s.type, s.outputPct])).toEqual([
            ['generator', 80],
            ['engine', 80],
            ['any', 60],
        ])
        for (const t of kindRegistry.templates as {itemId: number; kind: string}[]) {
            if (t.kind !== 'ship') continue
            for (const s of getEntityLayout(t.itemId)!.slots) {
                if (s.type !== 'any') expect(s.outputPct).toBeGreaterThanOrEqual(80)
            }
        }
    })

    test('WP-SF-21-02 the contract and SDK slot tables agree on every template', () => {
        const base = join(import.meta.dir, '../../../../../contracts/src/server/include/server')
        const registry = join(base, 'kind_registry.hpp')
        const items = join(base, 'items.hpp')
        expect(existsSync(registry) && existsSync(items)).toBe(true)
        const hpp = readFileSync(registry, 'utf8')
        const ids = new Map<string, number>()
        for (const m of readFileSync(items, 'utf8').matchAll(
            /constexpr uint16_t (ITEM_\w+)\s*=\s*(\d+);/g
        ))
            ids.set(m[1], Number(m[2]))

        const arrays = new Map<string, [string, number, number][]>()
        for (const m of hpp.matchAll(
            /constexpr std::array<slot_def, \d+> (\w+) = \{\{([\s\S]*?)\}\};/g
        )) {
            const slots = [...m[2].matchAll(/\{(MODULE_\w+),\s*(\d+)(?:,\s*(\d+))?\}/g)].map(
                (s) => [s[1], Number(s[2]), s[3] ? Number(s[3]) : 1] as [string, number, number]
            )
            arrays.set(m[1], slots)
        }
        const registryBlock = hpp.slice(hpp.indexOf('TEMPLATE_REGISTRY'))
        const templates = [
            ...registryBlock.matchAll(/\{(ITEM_\w+),\s*ENTITY_\w+,\s*view\((\w+)\)/g),
        ]
        expect(templates.length).toBeGreaterThan(30)
        for (const [, item, arrayName] of templates) {
            const contract = arrays.get(arrayName)!
            const sdk = getEntityLayout(ids.get(item)!)!.slots
            expect(sdk.length).toBe(contract.length)
            contract.forEach(([type, pct, maxTier], i) => {
                expect(`MODULE_${sdk[i].type.toUpperCase()}`).toBe(type)
                expect(sdk[i].outputPct).toBe(pct)
                expect(sdk[i].maxTier).toBe(maxTier)
            })
        }
    })
})

describe('SF-21 lane output at equal rolls', () => {
    const ROLES: [string, number, number, (c: any) => number][] = [
        ['gatherer yield', ITEM_GATHERER_T1, PROSPECTOR_T1, (c) => c.yield],
        ['crafter speed', ITEM_CRAFTER_T1, SMITH_T1, (c) => c.speed],
        ['builder speed', ITEM_BUILDER_T1, WRIGHT_T1, (c) => c.speed],
        ['loader thrust', ITEM_LOADER_T1, TENDER_T1, (c) => c.thrust],
        ['storage capacity', ITEM_STORAGE_T1, PORTER_T1, (c) => c.capacity],
        ['hauler efficiency', ITEM_HAULER_T1, TUG_T1, (c) => c.efficiency],
    ]
    const pct = (hull: number, type: string) =>
        getEntityLayout(hull)!.slots.find((s) => s.type === type)!.outputPct

    test('WP-SF-21-03 a module in a universal socket outputs at most 80% of the same module in its specialist socket, on every role with a specialist hull', () => {
        for (const stat of [MEAN_STAT, GOOD_STAT]) {
            for (const [name, item, hull, pick] of ROLES) {
                const typed = pick(computeModuleCapabilities(item, stats(stat), 100)!)
                const specialistType = getEntityLayout(hull)!.slots[2].type
                const spec = pick(
                    computeModuleCapabilities(item, stats(stat), pct(hull, specialistType))!
                )
                const ship = pick(computeModuleCapabilities(item, stats(stat), 80)!)
                const rous = pick(computeModuleCapabilities(item, stats(stat), 60)!)
                expect(spec).toBe(typed)
                expect(ship / spec, `${name} Ship T1`).toBeLessThanOrEqual(0.8)
                expect(rous / spec, `${name} Roustabout`).toBeLessThanOrEqual(0.6)
            }
        }
    })

    test('WP-SF-21-04 the amp scales output only: hauler capacity, loader payload and every drain are the same in a universal socket as in a specialist socket', () => {
        const at = (item: number, p: number) =>
            computeModuleCapabilities(item, stats(GOOD_STAT), p)!
        for (const p of [80, 60]) {
            expect((at(ITEM_HAULER_T1, p) as any).capacity).toBe(
                (at(ITEM_HAULER_T1, 100) as any).capacity
            )
            expect((at(ITEM_LOADER_T1, p) as any).payload).toBe(
                (at(ITEM_LOADER_T1, 100) as any).payload
            )
            for (const item of [
                ITEM_GATHERER_T1,
                ITEM_CRAFTER_T1,
                ITEM_BUILDER_T1,
                ITEM_STORAGE_T1,
                ITEM_HAULER_T1,
            ])
                expect((at(item, p) as any).drain).toBe((at(item, 100) as any).drain)
        }
    })
})

describe('SF-21 earning rate', () => {
    test('WP-SF-21-05 a Roustabout gatherer earns less than a Prospector T1 gatherer on loops of 1 to 50 tiles at equal rolls', () => {
        for (const stat of [MEAN_STAT, GOOD_STAT]) {
            for (const tiles of [1, 5, 10, 25, 50]) {
                const general = tonnesPerEpoch(roustabout(stat, ITEM_GATHERER_T1), tiles)
                const typed = tonnesPerEpoch(
                    specialist(PROSPECTOR_T1, stat, ITEM_GATHERER_T1),
                    tiles
                )
                expect(general, `stat ${stat} tiles ${tiles}`).toBeLessThan(typed)
            }
        }
    })

    test('WP-SF-21-06 a Roustabout crafter sustains less mass per hour than a Smith T1 at equal rolls', () => {
        for (const stat of [MEAN_STAT, GOOD_STAT]) {
            const general = sustainedCraftMassPerHour(roustabout(stat, ITEM_CRAFTER_T1))
            const typed = sustainedCraftMassPerHour(specialist(SMITH_T1, stat, ITEM_CRAFTER_T1))
            expect(general).toBeLessThan(typed)
        }
        const duration = (speed: number) => Number(calc_craft_duration(speed, 100_000))
        const g = roustabout(GOOD_STAT, ITEM_CRAFTER_T1).caps.crafterLanes![0].speed
        const t = specialist(SMITH_T1, GOOD_STAT, ITEM_CRAFTER_T1).caps.crafterLanes![0].speed
        expect(duration(g) / duration(t)).toBeGreaterThan(1 / 0.6 - 0.01)
    })

    test('WP-SF-21-07 the Ship T1 has no recipe and no recipe consumes it, so no player can obtain the 80% hull', () => {
        const rows = recipes as {outputItemId: number; inputs: {itemId: number}[]}[]
        expect(rows.some((r) => r.outputItemId === SHIP_T1)).toBe(false)
        expect(rows.some((r) => r.inputs.some((i) => i.itemId === SHIP_T1))).toBe(false)
    })

    test('WP-SF-21-08 a Ship T1 fitted with parallel lanes out-earns its specialist, so the claim holds only because that hull cannot be obtained and the Roustabout has one universal socket', () => {
        for (const stat of [MEAN_STAT, GOOD_STAT]) {
            const triple = shipT1(stat, [
                G,
                E,
                ITEM_GATHERER_T1,
                ITEM_GATHERER_T1,
                ITEM_GATHERER_T1,
            ])
            const typed = specialist(PROSPECTOR_T1, stat, ITEM_GATHERER_T1)
            for (const tiles of [1, 10, 50])
                expect(tonnesPerEpoch(triple, tiles)).toBeGreaterThan(
                    1.2 * tonnesPerEpoch(typed, tiles)
                )
            const quad = shipT1(stat, [
                G,
                ITEM_CRAFTER_T1,
                ITEM_CRAFTER_T1,
                ITEM_CRAFTER_T1,
                ITEM_CRAFTER_T1,
            ])
            const smith = specialist(SMITH_T1, stat, ITEM_CRAFTER_T1)
            expect(sustainedCraftMassPerHour(quad)).toBeGreaterThan(
                3 * sustainedCraftMassPerHour(smith)
            )
        }
        expect(getEntityLayout(ROUSTABOUT)!.slots.filter((s) => s.type === 'any').length).toBe(1)
    })
})
