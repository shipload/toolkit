import {describe, expect, test} from 'bun:test'
import {Checksum256} from '@wharfkit/antelope'
import {sdkSystemGraph, type Coord, type RouteLegCost} from '../../src/travel/route-planner'
import {estimateTrip, planWormholeRoute, wormholeTrips} from '../../src/travel/wormhole-route'
import {isValidWormholePair} from '../../src/derivation/wormhole'
import type {RouteMoverInput} from '../../src/travel/route-simulator'
import * as scan from '../../src/scan'

const LIVE_SEED = Checksum256.from(
    'cfb2190a3cd3895eced93eebd1383ab76ebcd4b61a064f8c456fb9c79fde7384'
)
const HOME: Coord = {x: 0, y: 0}
const ENTRANCE: Coord = {x: -167, y: -349}
const EXIT: Coord = {x: -552854, y: -984036}
const FAR_ROW: Coord = {x: -552851, y: -983951}
const REACH = 6.2
const RECHARGE = 1000

const legCost: RouteLegCost = ({distance, isDestination}) =>
    distance + (isDestination ? 0 : RECHARGE)

const ship: RouteMoverInput = {
    ref: {entityType: 'ship', entityId: 1},
    hasMovement: true,
    engines: {thrust: 800, drain: 1000},
    generator: {capacity: 6200, recharge: 50},
    mass: 5000,
    energy: 6200,
    priorMobilityEnd: 0,
    narrowBarrierEnd: 0,
}

describe('wormholeTrips', () => {
    test('finds the home mouth whose far end lies beside the far row', () => {
        const [trip] = wormholeTrips(LIVE_SEED, HOME, FAR_ROW, REACH, 128)
        expect(trip.entrance).toEqual(ENTRANCE)
        expect(trip.exit).toEqual(EXIT)
        expect(trip.legs).toBe(77)
        expect(isValidWormholePair(LIVE_SEED, ENTRANCE.x, ENTRANCE.y, EXIT.x, EXIT.y)).toBe(true)
    })

    test('rejects a pair whose legs exceed the cap', () => {
        expect(wormholeTrips(LIVE_SEED, HOME, FAR_ROW, REACH, 76)).toEqual([])
        expect(wormholeTrips(LIVE_SEED, HOME, FAR_ROW, REACH, 77)).toHaveLength(1)
    })

    test('a target under 50,000 ly has no trip', () => {
        expect(wormholeTrips(LIVE_SEED, HOME, {x: 30000, y: 30000}, REACH, 64)).toEqual([])
    })
})

describe('planWormholeRoute', () => {
    const graph = sdkSystemGraph(LIVE_SEED, scan)

    test('a target near the far mouth of a home mouth routes through the jump', () => {
        const result = planWormholeRoute({
            seed: LIVE_SEED,
            origin: HOME,
            dest: FAR_ROW,
            perLegReach: REACH,
            graph,
            maxLegs: 128,
            legCost,
        })
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.jump?.entrance).toEqual(ENTRANCE)
        expect(result.jump?.exit).toEqual(EXIT)
        expect(result.legs).toBeGreaterThanOrEqual(77)
        expect(result.legs).toBe(110)
        expect(result.waypoints[result.jump!.legsBefore - 1]).toEqual(ENTRANCE)
        expect(result.waypoints.at(-1)).toEqual(FAR_ROW)
    })

    test('energy carries across the jump: the leg into the entrance pays its recharge', () => {
        const result = planWormholeRoute({
            seed: LIVE_SEED,
            origin: HOME,
            dest: FAR_ROW,
            perLegReach: REACH,
            graph,
            maxLegs: 128,
            legCost,
        })
        if (!result.ok || !result.jump) throw new Error('expected a jump route')
        expect(result.seconds).toBeCloseTo(
            result.totalDistance + RECHARGE * (result.legs - 1) + result.jump.seconds,
            6
        )
    })

    test('under the cap the far row has no route', () => {
        const result = planWormholeRoute({
            seed: LIVE_SEED,
            origin: HOME,
            dest: FAR_ROW,
            perLegReach: REACH,
            graph,
            maxLegs: 64,
            legCost,
        })
        expect(result).toEqual({ok: false, reason: 'max-legs'})
    })

    test('a target under 50,000 ly never jumps', () => {
        const result = planWormholeRoute({
            seed: LIVE_SEED,
            origin: HOME,
            dest: ENTRANCE,
            perLegReach: REACH,
            graph,
            maxLegs: 128,
            legCost,
        })
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.jump).toBeUndefined()
    })
})

describe('estimateTrip', () => {
    test('the far row estimates as one jump in 77 legs', () => {
        const estimate = estimateTrip({
            seed: LIVE_SEED,
            origin: HOME,
            dest: FAR_ROW,
            perLegReach: REACH,
            movers: [ship],
            maxLegs: 451,
        })
        expect(estimate.legs).toBe(77)
        expect(estimate.jump?.exit).toEqual(EXIT)
        expect(estimate.seconds).toBeGreaterThan(estimate.jump!.seconds)
    })

    test('a near target estimates on the straight line', () => {
        const estimate = estimateTrip({
            seed: LIVE_SEED,
            origin: HOME,
            dest: ENTRANCE,
            perLegReach: REACH,
            movers: [ship],
            maxLegs: 451,
        })
        expect(estimate.jump).toBeUndefined()
        expect(estimate.legs).toBe(Math.ceil(Math.hypot(ENTRANCE.x, ENTRANCE.y) / REACH))
    })
})
