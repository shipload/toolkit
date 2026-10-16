import {describe, expect, test} from 'bun:test'
import {
    derivedLoaders,
    nftTransitDuration,
    unwrapTransitDuration,
    unwrapLoadDuration,
    estimateUnwrapDuration,
    incomingHoldMass,
    projectCargomass,
    projectedPeakCargomass,
    receiveFits,
} from './unwrap'
import {TimePoint, UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
import {
    ITEM_BEAM,
    ITEM_ENGINE_T1,
    ITEM_GENERATOR_T1,
    ITEM_ROUSTABOUT_T1A_PACKED,
} from '../data/item-ids'
import {getBaseHullmassFor} from '../derivation/capabilities'
import {TaskType} from '../types'

const REFERENCE_MASS =
    getBaseHullmassFor(ITEM_ROUSTABOUT_T1A_PACKED) +
    Number(getItem(ITEM_ENGINE_T1).mass) +
    Number(getItem(ITEM_GENERATOR_T1).mass)
const REFERENCE_DRAIN = 252_491
const REFERENCE_RECHARGE = 2000

function refillSeconds(distance: number): number {
    return Math.floor(Math.floor((distance * REFERENCE_DRAIN) / 10000) / REFERENCE_RECHARGE)
}

describe('unwrap duration mirror', () => {
    test('derivedLoaders aggregates lanes like derived_loaders()', () => {
        expect(derivedLoaders([])).toBeNull()
        expect(
            derivedLoaders([
                {payload: 600, thrust: 10},
                {payload: 701, thrust: 20},
            ])
        ).toEqual({payload: 650, thrust: 30, quantity: 2})
    })

    test('transit floors item mass at cruise-transition distance before cruise-capping flight time', () => {
        // distance 50000 is past the cruise transition; item mass 1000 is under the floor, so accel uses it
        const accel = (400 / (REFERENCE_MASS * 100)) * 10000
        const cruiseVelocity = Math.sqrt(accel * 2 * 10000)
        const expected = Math.floor(50000 / cruiseVelocity + cruiseVelocity / accel)
        expect(unwrapTransitDuration(1000, {x: 0, y: 0}, {x: 3, y: 4})).toBe(
            expected + refillSeconds(50000)
        )
    })

    test('transit below cruise transition uses the sqrt curve, and a heavy item skips the mass floor', () => {
        // distance 5000 is within the cruise transition
        const mass = REFERENCE_MASS * 2
        const accel = (400 / (mass * 100)) * 10000
        const expected = Math.floor(2 * Math.sqrt(5000 / accel))
        expect(unwrapTransitDuration(mass, {x: 0, y: 0}, {x: 0.3, y: 0.4})).toBe(
            expected + refillSeconds(5000)
        )
    })

    test('transit pays the reference engine energy back at the reference generator rate', () => {
        // Golden pair from placeentity on chain: a 48,473-mass starter relocated 100 tiles queues 20,563 s.
        expect(nftTransitDuration(1_000_000, 48_473)).toBe(20_563)
        expect(nftTransitDuration(1_000_000, 48_473)).toBeGreaterThan(refillSeconds(1_000_000))
        expect(nftTransitDuration(0, 48_473)).toBe(0)
    })

    test('load uses altitude z, divides the item by payload, divides by quantity', () => {
        const loaders = {payload: 640, thrust: 30, quantity: 2}
        const itemMass = 800
        const accel = (30 / (1250 * 100)) * 10000
        const flight = Math.floor(2 * Math.sqrt(3000 / accel))
        expect(unwrapLoadDuration(loaders, itemMass, 3000)).toBe(Math.floor(flight / 2))
    })

    test('zero item mass and no loaders are safe', () => {
        expect(unwrapTransitDuration(0, {x: 0, y: 0}, {x: 9, y: 9})).toBe(0)
        expect(unwrapLoadDuration(null, 500, 3000)).toBe(0)
    })

    test('load altitude is floored so ground-level (z=0) destinations are not instant', () => {
        const loaders = {payload: 500, thrust: 200, quantity: 1}
        const atZero = unwrapLoadDuration(loaders, 1000, 0)
        const at800 = unwrapLoadDuration(loaders, 1000, 800)
        expect(atZero).toBeGreaterThan(0)
        expect(atZero).toBe(at800)
    })

    test('estimateUnwrapDuration uses worst-loader baseline when dest has no loaders', () => {
        // IRON (101); same coords so transit is 0 and the estimate is baseline load alone
        const item = {itemId: 101, quantity: 10, modules: [], originX: 0, originY: 0}
        const bareDest = {loader_lanes: [], coordinates: {x: 0, y: 0, z: 800}}

        const bare = estimateUnwrapDuration(bareDest, item)
        expect(bare).toBeGreaterThan(0)

        const loadedDest = {
            loader_lanes: [{payload: 500, thrust: 200}],
            coordinates: {x: 0, y: 0, z: 800},
        }
        const loaded = estimateUnwrapDuration(loadedDest, item)
        expect(loaded).toBeLessThanOrEqual(bare)

        expect(unwrapLoadDuration(null, 500, 3000)).toBe(0)
    })
})

test('incomingHoldMass sums incoming-kind hold mass', () => {
    expect(incomingHoldMass([])).toBe(0)
    // PUSH(2) + FLIGHT(5) count; BUILD(4) does not
    expect(
        incomingHoldMass([
            {kind: 2, incoming_mass: 100},
            {kind: 4, incoming_mass: 999},
            {kind: 5, incoming_mass: 50},
        ])
    ).toBe(150)
})

test('projectedPeakCargomass tracks the running peak from cargomass', () => {
    const entity = {cargomass: 1000, lanes: [], cargo: [], schedule: undefined} as never
    // No pending tasks: peak = base + candidate add.
    expect(projectedPeakCargomass(entity, new Date(0), 500)).toBe(1500)
})

const DEPOSIT_START = new Date('2026-09-20T07:48:37.000Z')
const BEAM_QTY = 2_500
const BEAM_MASS = getItem(ITEM_BEAM).mass

function unloadingShip(projectedAtMs?: number) {
    const cargo = ServerContract.Types.cargo_item.from({
        item_id: UInt16.from(ITEM_BEAM),
        quantity: UInt32.from(BEAM_QTY),
        stats: UInt64.from(0),
        modules: [],
    })
    const lane = ServerContract.Types.lane.from({
        lane_key: UInt8.from(0),
        schedule: ServerContract.Types.schedule.from({
            started: TimePoint.fromMilliseconds(DEPOSIT_START.getTime()),
            tasks: [
                ServerContract.Types.task.from({
                    type: UInt8.from(TaskType.CIVIC_DEPOSIT),
                    duration: UInt32.from(1_309),
                    cancelable: UInt8.from(2),
                    cargo: [cargo],
                    couplings: [],
                }),
            ],
        }),
    })
    return {
        cargomass: BEAM_QTY * BEAM_MASS,
        lanes: [lane],
        holds: [],
        projected_at:
            projectedAtMs === undefined ? undefined : TimePoint.fromMilliseconds(projectedAtMs),
    }
}

const UNLOAD_ENDS = new Date(DEPOSIT_START.getTime() + 1_309_000)
const AFTER_UNLOAD = new Date(UNLOAD_ENDS.getTime() + 60_000)

test('projectCargomass reports the mass held at the candidate and the peak around it', () => {
    const plan = projectCargomass(unloadingShip(), AFTER_UNLOAD, 400 * BEAM_MASS)
    // The queued unload empties the hold before the candidate lands.
    expect(plan.used).toBe(400 * BEAM_MASS)
    expect(plan.peak).toBe(BEAM_QTY * BEAM_MASS)
})

test('a task already applied to a projected row is not replayed', () => {
    const applied = unloadingShip(UNLOAD_ENDS.getTime())
    applied.cargomass = 0
    const plan = projectCargomass(applied, AFTER_UNLOAD, 400 * BEAM_MASS)
    expect(plan.used).toBe(400 * BEAM_MASS)
    expect(plan.peak).toBe(400 * BEAM_MASS)
    expect(projectedPeakCargomass(applied, AFTER_UNLOAD, 400 * BEAM_MASS)).toBe(plan.peak)
})

const CRYSTAL = 201
const CRYSTAL_MASS = getItem(CRYSTAL).mass
const QUEUED_AT = new Date('2026-09-20T07:00:00.000Z')

function rawTask(type: number, duration: number, cargo: {item: number; quantity: number}[] = []) {
    return ServerContract.Types.task.from({
        type: UInt8.from(type),
        duration: UInt32.from(duration),
        cancelable: UInt8.from(2),
        cargo: cargo.map((c) =>
            ServerContract.Types.cargo_item.from({
                item_id: UInt16.from(c.item),
                quantity: UInt32.from(c.quantity),
                stats: UInt64.from(0),
                modules: [],
            })
        ),
        couplings: [],
    })
}

function rawLane(key: number, tasks: ServerContract.Types.task[]) {
    return ServerContract.Types.lane.from({
        lane_key: UInt8.from(key),
        schedule: ServerContract.Types.schedule.from({
            started: TimePoint.fromMilliseconds(QUEUED_AT.getTime()),
            tasks,
        }),
    })
}

describe('receiveFits behind a pending recharge', () => {
    const dest = {
        coordinates: {x: 0, y: 0, z: 800},
        loader_lanes: [{payload: 600, thrust: 4}],
        cargomass: 6_600 * CRYSTAL_MASS,
        capacity: 67_873,
        holds: [],
    }
    const item = {itemId: CRYSTAL, quantity: 200, modules: [], originX: 0, originY: 0}
    const unwrapSeconds = estimateUnwrapDuration(dest, item)
    const rechargeSeconds = unwrapSeconds * 10

    function withUnloadEndingAfter(unloadSeconds: number) {
        return {
            ...dest,
            lanes: [
                rawLane(255, [rawTask(TaskType.RECHARGE, rechargeSeconds)]),
                rawLane(3, [
                    rawTask(TaskType.IDLE, rechargeSeconds),
                    rawTask(TaskType.UNLOAD, unloadSeconds, [{item: CRYSTAL, quantity: 100}]),
                ]),
            ],
        }
    }

    test('counts an unload that completes before the unwrap starts its load', () => {
        expect(receiveFits(withUnloadEndingAfter(unwrapSeconds - 1), item, QUEUED_AT)).toBe(true)
    })

    test('refuses when the unload completes after the unwrap', () => {
        expect(receiveFits(withUnloadEndingAfter(unwrapSeconds + 1), item, QUEUED_AT)).toBe(false)
    })
})
