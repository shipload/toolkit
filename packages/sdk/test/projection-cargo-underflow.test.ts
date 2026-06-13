import {describe, expect, test} from 'bun:test'
import {TimePoint, UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../src/contracts'
import {TaskType} from '../src/types'
import {LANE_MOBILITY} from '../src/scheduling/schedule'
import {projectRemainingAt} from '../src/scheduling/projection'
import {cargoItemToStack, subtractFromStacks} from '../src/capabilities/storage'
import {makeTask} from './helpers'

const STARTED = '2024-06-04T00:00:00.000'

function stack(itemId: number, quantity: number, stats = 0) {
    return cargoItemToStack(
        ServerContract.Types.cargo_item.from({
            item_id: UInt16.from(itemId),
            quantity: UInt32.from(quantity),
            stats: UInt64.from(stats),
            modules: [],
        })
    )
}

function lane(laneKey: number, started: string, tasks: ServerContract.Types.task[]) {
    return ServerContract.Types.lane.from({
        lane_key: UInt8.from(laneKey),
        schedule: ServerContract.Types.schedule.from({
            started: TimePoint.from(started),
            tasks,
        }),
    })
}

// Mirrors the contract's tolerant subtract_cargo: never throws on underflow.
describe('subtractFromStacks (tolerant, mirrors contract subtract_cargo)', () => {
    test('missing stack is a no-op', () => {
        const stacks = [stack(201, 100)]
        expect(subtractFromStacks(stacks, stack(999, 5))).toEqual(stacks)
    })

    test('insufficient quantity clamps the stack away instead of throwing', () => {
        const result = subtractFromStacks([stack(201, 100)], stack(201, 250))
        expect(result).toEqual([])
    })

    test('sufficient quantity subtracts normally', () => {
        const result = subtractFromStacks([stack(201, 100)], stack(201, 30))
        expect(result[0].quantity.toNumber()).toBe(70)
    })

    test('exact quantity removes the stack', () => {
        expect(subtractFromStacks([stack(201, 100)], stack(201, 100))).toEqual([])
    })
})

// Extractor 15 on Jungle 4: a completed UNLOAD of 9305 replays against an already-resolved (empty) cargo base.
describe('projectRemainingAt does not throw on cargo underflow', () => {
    const entity = {
        coordinates: {x: -64, y: -10},
        energy: UInt16.from(919),
        hullmass: UInt32.from(2680500),
        cargo: [],
        cargomass: UInt32.from(0),
        lanes: [
            lane(LANE_MOBILITY, STARTED, [
                makeTask(TaskType.UNLOAD, {
                    duration: 100,
                    cargo: [{item_id: 201, quantity: 9305, stats: 554877173}],
                }),
            ]),
            lane(2, STARTED, [
                makeTask(TaskType.GATHER, {
                    duration: 100,
                    coordinates: {x: -64, y: -10},
                    cargo: [{item_id: 201, quantity: 1135, stats: 554877173}],
                }),
            ]),
        ],
    }

    test('underflowing unload no longer throws', () => {
        expect(() => projectRemainingAt(entity, new Date(STARTED))).not.toThrow()
    })

    test('the gather output survives the tolerant unload', () => {
        const projected = projectRemainingAt(entity, new Date(STARTED))
        const crude = projected.cargo.find((s) => s.item_id.toNumber() === 201)
        expect(crude?.quantity.toNumber()).toBe(1135)
    })
})
