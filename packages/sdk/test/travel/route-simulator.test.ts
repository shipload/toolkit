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

    test('group: ship + towed container includes hauler drain', () => {
        const shipWithHauler: RouteMoverInput = {
            ref: {entityType: 'ship', entityId: 1},
            hasMovement: true,
            engines: {thrust: 800, drain: 600},
            generator: {capacity: 100000, recharge: 500},
            hauler: {capacity: 5000, drain: 100, efficiency: 8000},
            mass: 5000,
            energy: 100000,
            priorMobilityEnd: 0,
            narrowBarrierEnd: 0,
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
        const result = simulateRoute([shipWithHauler, container], waypoints, origin, true)

        expect(result.legs.length).toBe(1)
        const cost = result.legs[0].energyCostByMover['1']
        expect(cost).toBeDefined()
        expect(cost).toBeGreaterThan(0)

        const costWithHauler = result.legs[0].energyCostByMover['1']
        const shipOnlySim = simulateRoute([ship], waypoints, origin, true)
        const baseCost = shipOnlySim.legs[0].energyCostByMover['1']
        expect(costWithHauler).toBeGreaterThan(baseCost)

        expect(result.legs[0].energyCostByMover['2']).toBeUndefined()
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
