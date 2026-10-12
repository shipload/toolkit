import {describe, expect, test} from 'bun:test'
import {ServerContract, TaskCancelable, TaskType} from '../../src/index-module'
import {calc_travel_cargomass} from '../../src/travel/travel'

const T0 = '2026-06-19T00:00:00'
const ORE = 101
const ORE_MASS = 10
const UNITS = 400

function shipWith(taskType: number, duration: number) {
    return ServerContract.Types.entity_info.from({
        projected_at: 0,
        type: 'ship',
        id: 1,
        owner: 'player.gm',
        entity_name: 'Ship 1',
        coordinates: {x: 0, y: 0, z: 0},
        item_id: 1,
        cargomass: UNITS * ORE_MASS,
        cargo: [{item_id: ORE, quantity: UNITS, stats: 0, modules: [], id: 1}],
        modules: [],
        lanes: [
            {
                lane_key: 1,
                schedule: {
                    started: T0,
                    tasks: [
                        {
                            type: taskType,
                            duration,
                            cancelable: TaskCancelable.ALWAYS,
                            cargo: [{item_id: ORE, quantity: UNITS, stats: 0, modules: []}],
                            couplings: [],
                        },
                    ],
                },
            },
        ],
        gatherer_lanes: [],
        crafter_lanes: [],
        builder_lanes: [],
        loader_lanes: [],
        holds: [],
    })
}

describe('calc_travel_cargomass', () => {
    test('an unload that completes at or before departure leaves the flight light', () => {
        const ship = shipWith(TaskType.UNLOAD, 50)
        expect(calc_travel_cargomass(ship, new Date(`${T0}Z`))).toBe(UNITS * ORE_MASS)
        expect(calc_travel_cargomass(ship, new Date('2026-06-19T00:00:50.000Z'))).toBe(0)
        expect(calc_travel_cargomass(ship, new Date('2026-06-19T00:01:00.000Z'))).toBe(0)
    })

    test('an unload that completes after departure is still aboard and still paid for', () => {
        const ship = shipWith(TaskType.UNLOAD, 600)
        expect(calc_travel_cargomass(ship, new Date('2026-06-19T00:00:50.000Z'))).toBe(
            UNITS * ORE_MASS
        )
    })
})
