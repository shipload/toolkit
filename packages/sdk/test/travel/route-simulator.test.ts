import {describe, expect, test} from 'bun:test'
import {simulateRoute} from '../../src/travel/route-simulator'
import type {RouteMoverInput} from '../../src/travel/route-simulator'

const ship: RouteMoverInput = {
    ref: {entityType: 'ship', entityId: 1},
    hasMovement: true,
    engines: {thrust: 800, drain: 600},
    generator: {capacity: 100000, recharge: 500},
    mass: 5000,
    energy: 100000,
    priorMobilityEnd: 0,
    narrowBarrierEnd: 0,
}

describe('simulateRoute', () => {
    test('solo two equal legs (Option A recharge)', () => {
        const origin = {x: 0, y: 0}
        const waypoints = [
            {x: 10, y: 0},
            {x: 20, y: 0},
        ]
        const result = simulateRoute([ship], waypoints, origin, true)

        expect(result.legs.length).toBe(2)
        expect(result.legs[0].rechargeBefore).toBe(false)
        expect(result.legs[1].rechargeBefore).toBe(true)
        expect(result.reachable).toBe(true)
        expect(result.legs[0].flightSeconds).toBeGreaterThan(0)
        expect(result.legs[1].flightSeconds).toBeGreaterThan(0)
    })

    test('a towed hauler adds only its mass to the group', () => {
        const tug: RouteMoverInput = {...ship, hauler: {capacity: 2, efficiency: 8000}}
        const plain: RouteMoverInput = {
            ref: {entityType: 'ship', entityId: 2},
            hasMovement: false,
            mass: 3000,
            energy: 0,
            priorMobilityEnd: 0,
            narrowBarrierEnd: 0,
        }
        const towedHauler: RouteMoverInput = {...plain, hauler: {capacity: 5, efficiency: 10000}}
        const waypoints = [{x: 10, y: 0}]
        const a = simulateRoute([tug, plain], waypoints, {x: 0, y: 0}, false)
        const b = simulateRoute([tug, towedHauler], waypoints, {x: 0, y: 0}, false)
        expect(b.legs[0].flightSeconds).toBe(a.legs[0].flightSeconds)
    })

    test('a busy towed member delays the group departure', () => {
        const busy: RouteMoverInput = {
            ref: {entityType: 'container', entityId: 2},
            hasMovement: false,
            mass: 3000,
            energy: 0,
            priorMobilityEnd: 0,
            narrowBarrierEnd: 500,
        }
        const tug: RouteMoverInput = {...ship, hauler: {capacity: 2, efficiency: 8000}}
        const idle = simulateRoute([tug], [{x: 10, y: 0}], {x: 0, y: 0}, false)
        const delayed = simulateRoute([tug, busy], [{x: 10, y: 0}], {x: 0, y: 0}, false)
        expect(delayed.totalSeconds).toBeGreaterThanOrEqual(500)
        expect(delayed.totalSeconds).toBeGreaterThan(idle.totalSeconds)
    })

    test('towed containers change flight time but not mover energy cost', () => {
        const shipWithBeam: RouteMoverInput = {
            ...ship,
            engines: {thrust: 800, drain: 700},
            hauler: {capacity: 2, efficiency: 8000},
        }
        const container: RouteMoverInput = {
            ref: {entityType: 'container', entityId: 2},
            hasMovement: false,
            mass: 3000,
            energy: 0,
            priorMobilityEnd: 0,
            narrowBarrierEnd: 0,
        }

        const origin = {x: 0, y: 0}
        const waypoints = [{x: 10, y: 0}]
        const empty = simulateRoute([shipWithBeam], waypoints, origin, true)
        const loaded = simulateRoute([shipWithBeam, container], waypoints, origin, true)

        expect(loaded.legs[0].energyCostByMover['1']).toBe(empty.legs[0].energyCostByMover['1'])
        expect(loaded.legs[0].flightSeconds).toBeGreaterThan(empty.legs[0].flightSeconds)
        expect(loaded.legs[0].energyCostByMover['2']).toBeUndefined()
    })

    test('charges fractional distance from effective movement drain only', () => {
        const mover: RouteMoverInput = {
            ...ship,
            engines: {thrust: 800, drain: 120},
            generator: {capacity: 1000, recharge: 500},
            hauler: {capacity: 1, efficiency: 8000},
            energy: 1000,
        }
        const result = simulateRoute([mover], [{x: 5.5, y: 0}], {x: 0, y: 0}, true)

        expect(result.legs[0].distanceCells).toBe(5.5)
        expect(result.legs[0].energyCostByMover['1']).toBe(660)
    })

    test('24-hour duration cap rejects an energy-feasible heavy leg', () => {
        const heavy: RouteMoverInput = {
            ...ship,
            engines: {thrust: 1, drain: 1},
            generator: {capacity: 1000, recharge: 500},
            mass: 4_000_000_000,
            energy: 1000,
        }
        const result = simulateRoute([heavy], [{x: 1, y: 0}], {x: 0, y: 0}, true)
        expect(result.legs[0].energyCostByMover['1']).toBe(1)
        expect(result.legs[0].flightSeconds).toBeGreaterThan(86_400)
        expect(result.reachable).toBe(false)
    })

    test('recharge=false depletion sets reachable=false', () => {
        const weakShip: RouteMoverInput = {
            ref: {entityType: 'ship', entityId: 1},
            hasMovement: true,
            engines: {thrust: 800, drain: 600},
            mass: 5000,
            energy: 100,
            priorMobilityEnd: 0,
            narrowBarrierEnd: 0,
        }

        const origin = {x: 0, y: 0}
        const waypoints = [
            {x: 10, y: 0},
            {x: 20, y: 0},
        ]
        const result = simulateRoute([weakShip], waypoints, origin, false)

        expect(result.reachable).toBe(false)
    })
})
