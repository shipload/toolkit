import {describe, expect, test} from 'bun:test'
import {TimePoint, UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {
    ServerContract,
    candidateLaneCompletesAt,
    getItem,
    laneKeyForModule,
    rawScheduleEnd,
    workerLaneKey,
} from '$lib'

const GENERATOR_ITEM_ID = 10101
const CRAFTER_ITEM_ID = 10104
const STARTED = '2026-06-11T00:00:00.000'

function moduleEntry(itemId: number): ServerContract.Types.module_entry {
    return ServerContract.Types.module_entry.from({
        type: UInt8.from(0),
        installed: ServerContract.Types.packed_module.from({
            item_id: UInt16.from(itemId),
            stats: UInt64.from(0),
        }),
    })
}

function task(duration: number): ServerContract.Types.task {
    return ServerContract.Types.task.from({
        type: UInt16.from(0),
        duration: UInt32.from(duration),
        cancelable: 0,
        cargo: [],
        couplings: [],
    })
}

function schedule(started: string, durations: number[]): ServerContract.Types.schedule {
    return ServerContract.Types.schedule.from({
        started: TimePoint.from(started),
        tasks: durations.map(task),
    })
}

function lane(laneKey: number, started: string, durations: number[]): ServerContract.Types.lane {
    return ServerContract.Types.lane.from({
        lane_key: UInt8.from(laneKey),
        schedule: schedule(started, durations),
    })
}

describe('worker lane helpers', () => {
    test('laneKeyForModule mirrors slot index plus one', () => {
        expect(laneKeyForModule(1)).toBe(2)
    })

    test('catalog module subtype strings identify crafter and generator modules', () => {
        expect(getItem(CRAFTER_ITEM_ID).moduleType).toBe('crafter')
        expect(getItem(GENERATOR_ITEM_ID).moduleType).toBe('generator')
    })

    test('workerLaneKey returns the first free matching installed worker lane', () => {
        const modules = [moduleEntry(GENERATOR_ITEM_ID), moduleEntry(CRAFTER_ITEM_ID)]

        expect(workerLaneKey(modules, 'crafter', [])).toBe(2)
    })

    test('workerLaneKey treats an existing empty matching lane as free', () => {
        const modules = [
            moduleEntry(GENERATOR_ITEM_ID),
            moduleEntry(CRAFTER_ITEM_ID),
            moduleEntry(CRAFTER_ITEM_ID),
        ]
        const lanes = [lane(2, STARTED, [])]

        expect(workerLaneKey(modules, 'crafter', lanes)).toBe(2)
    })

    test('workerLaneKey returns a later free matching lane before falling back to occupied', () => {
        const modules = [
            moduleEntry(GENERATOR_ITEM_ID),
            moduleEntry(CRAFTER_ITEM_ID),
            moduleEntry(CRAFTER_ITEM_ID),
        ]
        const lanes = [lane(2, STARTED, [30])]

        expect(workerLaneKey(modules, 'crafter', lanes)).toBe(3)
    })

    test('workerLaneKey returns the lowest occupied matching lane when none are free', () => {
        const modules = [moduleEntry(GENERATOR_ITEM_ID), moduleEntry(CRAFTER_ITEM_ID)]
        const lanes = [lane(2, STARTED, [30])]

        expect(workerLaneKey(modules, 'crafter', lanes)).toBe(2)
    })

    test('rawScheduleEnd sums task durations from schedule start', () => {
        const started = '2026-06-11T01:02:03.000'

        expect(rawScheduleEnd(schedule(started, [7, 11, 13]))).toEqual(
            new Date('2026-06-11T01:02:34.000Z')
        )
    })

    test('candidateLaneCompletesAt appends duration after an active future lane end', () => {
        const entity = {lanes: [lane(2, STARTED, [120])]}
        const now = new Date('2026-06-11T00:00:30.000Z')

        expect(candidateLaneCompletesAt(entity, 2, 45, now)).toEqual(
            new Date('2026-06-11T00:02:45.000Z')
        )
    })

    test('candidateLaneCompletesAt clamps a stale lane end to now before adding duration', () => {
        const entity = {lanes: [lane(2, STARTED, [30])]}
        const now = new Date('2026-06-11T00:05:00.000Z')

        expect(candidateLaneCompletesAt(entity, 2, 45, now)).toEqual(
            new Date('2026-06-11T00:05:45.000Z')
        )
    })
})
