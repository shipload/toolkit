import {describe, expect, test} from 'bun:test'
import {TimePoint, UInt8, UInt32, UInt64} from '@wharfkit/antelope'
import {ServerContract, TaskType, getInterpolatedPosition, schedule} from '$lib'
import {makeTask} from './helpers'

const STARTED = '2024-06-04T00:00:00.000'

function lane(laneKey: number, started: string, tasks: ServerContract.Types.task[]) {
    return ServerContract.Types.lane.from({
        lane_key: UInt8.from(laneKey),
        schedule: ServerContract.Types.schedule.from({
            started: TimePoint.from(started),
            tasks,
        }),
    })
}

describe('multi-lane scheduling', () => {
    test('per-lane current task is independent across lanes', () => {
        const entity = {
            coordinates: {x: 0, y: 0},
            lanes: [
                // mobility lane: a 100s travel to (10, 0)
                lane(schedule.LANE_MOBILITY, STARTED, [
                    makeTask(TaskType.TRAVEL, {duration: 100, coordinates: {x: 10, y: 0}}),
                ]),
                // worker lane (slot 0 → key 1): a 100s gather
                lane(1, STARTED, [
                    makeTask(TaskType.GATHER, {
                        duration: 100,
                        cargo: [{item_id: 5, quantity: 100, stats: 200}],
                    }),
                ]),
            ],
        }

        const now = new Date(new Date(STARTED).getTime() + 50_000)

        expect(schedule.currentTaskTypeForLane(entity, schedule.LANE_MOBILITY, now)).toBe(
            TaskType.TRAVEL
        )
        expect(schedule.currentTaskTypeForLane(entity, 1, now)).toBe(TaskType.GATHER)

        // entity-level "what is it doing now" is the set of active lane ops
        const active = schedule.activeTasks(entity, now).map((t) => t.type.toNumber())
        expect(active.sort()).toEqual([TaskType.TRAVEL, TaskType.GATHER].sort())

        expect(schedule.isGathering(entity, now)).toBeTrue()
        expect(schedule.isInFlight(entity, now)).toBeTrue()
    })

    test('interpolatedPositionAt follows the mobility lane, ignoring the gather lane', () => {
        const entity = {
            coordinates: {x: 0, y: 0},
            lanes: [
                lane(schedule.LANE_MOBILITY, STARTED, [
                    makeTask(TaskType.TRAVEL, {duration: 100, coordinates: {x: 100, y: 0}}),
                ]),
                lane(1, STARTED, [
                    makeTask(TaskType.GATHER, {
                        duration: 100,
                        coordinates: {x: 999, y: 999},
                        cargo: [{item_id: 5, quantity: 10, stats: 200}],
                    }),
                ]),
            ],
        }

        const now = new Date(new Date(STARTED).getTime() + 50_000)
        const mobilityIdx = schedule.currentTaskIndexOf(entity, schedule.LANE_MOBILITY, now)
        const progress = 0.5
        const pos = getInterpolatedPosition(entity, mobilityIdx, progress)

        // halfway along the eased travel curve, x is between origin and dest, y stays 0
        expect(pos.y).toBe(0)
        expect(pos.x).toBeGreaterThan(0)
        expect(pos.x).toBeLessThan(100)
    })

    test('canonical resolve order: completesAt asc, recharge defers, then lane_key asc', () => {
        // mobility lane: travel (60s) then recharge (0s) → both complete at the same instant
        // worker lane 1: gather (60s) completes at the same instant as the travel
        const entity = {
            coordinates: {x: 0, y: 0},
            lanes: [
                lane(schedule.LANE_MOBILITY, STARTED, [
                    makeTask(TaskType.TRAVEL, {duration: 60, coordinates: {x: 5, y: 0}}),
                    makeTask(TaskType.RECHARGE, {duration: 0}),
                ]),
                lane(1, STARTED, [
                    makeTask(TaskType.GATHER, {
                        duration: 60,
                        cargo: [{item_id: 5, quantity: 10, stats: 200}],
                    }),
                ]),
            ],
        }

        const now = new Date(new Date(STARTED).getTime() + 120_000)
        const order = schedule.resolveOrder(entity, now)
        const seq = order.map((e) => ({lane: e.laneKey, type: e.task.type.toNumber()}))

        // travel (lane 0) and gather (lane 1) co-complete at +60s → lane_key asc: travel first, gather second
        // recharge co-completes at +60s but defers behind both non-recharge tasks
        expect(seq).toEqual([
            {lane: schedule.LANE_MOBILITY, type: TaskType.TRAVEL},
            {lane: 1, type: TaskType.GATHER},
            {lane: schedule.LANE_MOBILITY, type: TaskType.RECHARGE},
        ])
    })

    test('deferred lane (future started) has no current task and remaining includes the wait', () => {
        const startedMs = new Date(STARTED).getTime()
        const deferred = new Date(startedMs + 420_000).toISOString().replace('Z', '')
        const entity = {
            coordinates: {x: 0, y: 0},
            lanes: [
                lane(schedule.LANE_MOBILITY, STARTED, [
                    makeTask(TaskType.TRAVEL, {duration: 300, coordinates: {x: 10, y: 0}}),
                    makeTask(TaskType.WARP, {duration: 120, coordinates: {x: 20, y: 0}}),
                ]),
                lane(1, deferred, [
                    makeTask(TaskType.GATHER, {
                        duration: 240,
                        cargo: [{item_id: 5, quantity: 100, stats: 200}],
                    }),
                    makeTask(TaskType.GATHER, {
                        duration: 240,
                        cargo: [{item_id: 5, quantity: 100, stats: 200}],
                    }),
                ]),
            ],
        }

        const now = new Date(startedMs + 78_000)

        expect(schedule.laneStartsInOf(entity, 1, now)).toBe(342)
        expect(schedule.laneStartsInOf(entity, schedule.LANE_MOBILITY, now)).toBe(0)
        expect(schedule.currentTaskIndexOf(entity, 1, now)).toBe(-1)
        expect(schedule.currentTaskForLane(entity, 1, now)).toBeUndefined()

        const active = schedule.activeTasks(entity, now).map((t) => t.type.toNumber())
        expect(active).toEqual([TaskType.TRAVEL])
        expect(schedule.isGathering(entity, now)).toBeFalse()
        expect(schedule.isInFlight(entity, now)).toBeTrue()

        expect(schedule.laneRemainingOf(entity, 1, now)).toBe(342 + 480)
        expect(schedule.scheduleRemaining(entity, now)).toBe(342 + 480)
        expect(schedule.laneProgressOf(entity, 1, now)).toBe(0)
        expect(schedule.laneCompleteOf(entity, 1, now)).toBeFalse()

        const afterStart = new Date(startedMs + 480_000)
        expect(schedule.laneStartsInOf(entity, 1, afterStart)).toBe(0)
        expect(schedule.currentTaskIndexOf(entity, 1, afterStart)).toBe(0)
        expect(schedule.laneRemainingOf(entity, 1, afterStart)).toBe(420)
    })

    test('idle entity (empty lanes) reads as idle', () => {
        const entity = {coordinates: {x: 0, y: 0}, lanes: []}
        expect(schedule.isIdle(entity)).toBeTrue()
        expect(schedule.hasSchedule(entity)).toBeFalse()
    })

    test('entity with a live hold and empty lanes is NOT idle', () => {
        const hold = ServerContract.Types.hold.from({
            id: UInt64.from(1),
            kind: UInt8.from(4),
            counterpart: ServerContract.Types.entity_ref.from({
                entity_type: 'ship',
                entity_id: UInt64.from(7),
            }),
            until: TimePoint.from('2026-06-02T10:00:00.000'),
            incoming_mass: UInt32.from(0),
        })
        const entity = {coordinates: {x: 0, y: 0}, lanes: [], holds: [hold]}
        expect(schedule.isIdle(entity)).toBeFalse()
        expect(schedule.isEntityIdle(entity, new Date('2026-06-02T11:00:00.000Z'))).toBeFalse()
    })

    test('entity whose current mobility task is TRANSIT reads as in-flight', () => {
        const entity = {
            coordinates: {x: 0, y: 0},
            lanes: [
                lane(schedule.LANE_MOBILITY, STARTED, [
                    makeTask(TaskType.TRANSIT, {duration: 100, coordinates: {x: 10, y: 0}}),
                ]),
            ],
        }

        const now = new Date(new Date(STARTED).getTime() + 50_000)

        expect(schedule.isInFlight(entity, now)).toBeTrue()
    })
})

describe('hasResolvable', () => {
    const at = (deltaSec: number) => new Date(new Date(STARTED).getTime() + deltaSec * 1000)
    const gather = (duration: number) =>
        makeTask(TaskType.GATHER, {duration, cargo: [{item_id: 5, quantity: 10, stats: 200}]})

    const singleDoneFront = {
        coordinates: {x: 0, y: 0},
        lanes: [lane(schedule.LANE_MOBILITY, STARTED, [makeTask(TaskType.TRAVEL, {duration: 30})])],
    }
    const oneRunningOneDone = {
        coordinates: {x: 0, y: 0},
        lanes: [
            lane(schedule.LANE_MOBILITY, STARTED, [makeTask(TaskType.TRAVEL, {duration: 300})]),
            lane(1, STARTED, [gather(30)]),
        ],
    }
    const futureLaneStart = new Date(new Date(STARTED).getTime() + 120_000)
        .toISOString()
        .replace('Z', '')
    const notYetStartedOnly = {
        coordinates: {x: 0, y: 0},
        lanes: [lane(1, futureLaneStart, [gather(30)])],
    }
    const notYetStartedPlusDone = {
        coordinates: {x: 0, y: 0},
        lanes: [lane(1, futureLaneStart, [gather(30)]), lane(2, STARTED, [gather(30)])],
    }
    const futureStarted = {
        coordinates: {x: 0, y: 0},
        lanes: [
            lane(
                1,
                new Date(new Date(STARTED).getTime() + 120_000).toISOString().replace('Z', ''),
                [gather(30)]
            ),
        ],
    }
    const empty = {coordinates: {x: 0, y: 0}, lanes: []}

    test('single completed front → true', () => {
        expect(schedule.hasResolvable(singleDoneFront, at(60))).toBeTrue()
    })
    test('multi-lane: one lane running, another lane front complete → true', () => {
        expect(schedule.hasResolvable(oneRunningOneDone, at(60))).toBeTrue()
    })
    test('lane with only a not-yet-started front → false', () => {
        expect(schedule.hasResolvable(notYetStartedOnly, at(60))).toBeFalse()
    })
    test('not-yet-started front in one lane + completed front in another → true', () => {
        expect(schedule.hasResolvable(notYetStartedPlusDone, at(60))).toBeTrue()
    })
    test('future-started lane (not yet begun) → false', () => {
        expect(schedule.hasResolvable(futureStarted, at(60))).toBeFalse()
    })
    test('empty / no schedule → false', () => {
        expect(schedule.hasResolvable(empty, at(60))).toBeFalse()
    })
    test('invariant: hasResolvable === (resolveOrder length > 0)', () => {
        for (const entity of [
            singleDoneFront,
            oneRunningOneDone,
            notYetStartedOnly,
            notYetStartedPlusDone,
            futureStarted,
            empty,
        ]) {
            const now = at(60)
            expect(schedule.hasResolvable(entity, now)).toBe(
                schedule.resolveOrder(entity, now).length > 0
            )
        }
    })
})
