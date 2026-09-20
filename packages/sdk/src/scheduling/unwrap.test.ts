import {describe, expect, test} from 'bun:test'
import {
    derivedLoaders,
    unwrapTransitDuration,
    unwrapLoadDuration,
    estimateUnwrapDuration,
    incomingHoldMass,
    projectCargomass,
    projectedPeakCargomass,
} from './unwrap'
import {TimePoint, UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {getItem} from '../data/catalog'
import {ITEM_BEAM} from '../data/item-ids'
import {TaskType} from '../types'

describe('unwrap duration mirror', () => {
    test('derivedLoaders aggregates lanes like derived_loaders()', () => {
        expect(derivedLoaders([])).toBeNull()
        expect(
            derivedLoaders([
                {mass: 1000, thrust: 10},
                {mass: 1400, thrust: 20},
            ])
        ).toEqual({mass: 1200, thrust: 30, quantity: 2}) // floor(2400/2)=1200, sum thrust, count
    })

    test('transit floors distance then flight time', () => {
        // distance = floor(sqrt(3^2+4^2)*10000)=50000; accel=400/(mass*100)*10000; flight=floor(2*sqrt(d/accel))
        const mass = 1000
        const accel = (400 / (mass * 100)) * 10000
        const expected = Math.floor(2 * Math.sqrt(50000 / accel))
        expect(unwrapTransitDuration(mass, {x: 0, y: 0}, {x: 3, y: 4})).toBe(expected)
    })

    test('load uses altitude z, adds loader mass, divides by quantity', () => {
        const loaders = {mass: 1200, thrust: 30, quantity: 2}
        const itemMass = 800
        const accel = (30 / ((itemMass + 1200) * 100)) * 10000
        const flight = Math.floor(2 * Math.sqrt(3000 / accel))
        expect(unwrapLoadDuration(loaders, itemMass, 3000)).toBe(Math.floor(flight / 2))
    })

    test('zero item mass and no loaders are safe', () => {
        expect(unwrapTransitDuration(0, {x: 0, y: 0}, {x: 9, y: 9})).toBe(0)
        expect(unwrapLoadDuration(null, 500, 3000)).toBe(0)
    })

    test('load altitude is floored so ground-level (z=0) destinations are not instant', () => {
        const loaders = {mass: 500, thrust: 200, quantity: 1}
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
            loader_lanes: [{mass: 500, thrust: 200}],
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
