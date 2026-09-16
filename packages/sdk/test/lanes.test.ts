import {describe, expect, test} from 'bun:test'
import {TimePoint, UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {
    ServerContract,
    candidateLaneCompletesAt,
    candidateCivicDepositWindow,
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

function task(duration: number, type = 0): ServerContract.Types.task {
    return ServerContract.Types.task.from({
        type: UInt16.from(type),
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

function typedLane(laneKey: number, started: string, tasks: ServerContract.Types.task[]) {
    return ServerContract.Types.lane.from({
        lane_key: UInt8.from(laneKey),
        schedule: ServerContract.Types.schedule.from({started: TimePoint.from(started), tasks}),
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

    test('civic deposit uses the first free loader lane and waits for mobility', () => {
        const modules = [
            moduleEntry(GENERATOR_ITEM_ID),
            moduleEntry(10103),
            moduleEntry(10103),
        ]
        const entity = {
            modules,
            lanes: [
                typedLane(0, STARTED, [task(90, 1)]),
                lane(2, STARTED, [300]),
            ],
        }
        const now = new Date('2026-06-11T00:00:30.900Z')

        expect(candidateCivicDepositWindow(entity, 45, now)).toEqual({
            laneKey: 3,
            startsAt: new Date('2026-06-11T00:01:30.000Z'),
            completesAt: new Date('2026-06-11T00:02:15.000Z'),
        })
    })

    test('civic deposit on busy loaders chooses the lowest lane and waits for recharge', () => {
        const modules = [moduleEntry(10103), moduleEntry(10103)]
        const recharge = ServerContract.Types.task.from({
            type: UInt16.from(2),
            duration: UInt32.from(80),
            cancelable: 0,
            cargo: [],
            couplings: [],
        })
        const entity = {
            modules,
            lanes: [
                lane(1, STARTED, [40]),
                lane(2, STARTED, [20]),
                ServerContract.Types.lane.from({
                    lane_key: UInt8.from(4),
                    schedule: ServerContract.Types.schedule.from({
                        started: TimePoint.from(STARTED),
                        tasks: [recharge],
                    }),
                }),
            ],
        }

        expect(candidateCivicDepositWindow(entity, 5, new Date(`${STARTED}Z`))).toEqual({
            laneKey: 1,
            startsAt: new Date('2026-06-11T00:01:20.000Z'),
            completesAt: new Date('2026-06-11T00:01:25.000Z'),
        })
    })

    test('civic deposit rounds a fractional cargo-ready barrier up from the lane end', () => {
        const modules = [moduleEntry(10103)]
        const now = new Date('2026-06-11T00:00:00.500Z')
        const cargoReady = new Date('2026-06-11T00:00:10.500Z')

        expect(candidateCivicDepositWindow({modules, lanes: []}, 5, now, cargoReady)).toEqual({
            laneKey: 1,
            startsAt: new Date('2026-06-11T00:00:11.000Z'),
            completesAt: new Date('2026-06-11T00:00:16.000Z'),
        })
    })

    test('civic deposit falls back to mobility when no loader is installed', () => {
        expect(
            candidateCivicDepositWindow(
                {modules: [moduleEntry(GENERATOR_ITEM_ID)], lanes: []},
                5,
                new Date('2026-06-11T00:00:00.500Z')
            ).laneKey
        ).toBe(0)
    })
})
