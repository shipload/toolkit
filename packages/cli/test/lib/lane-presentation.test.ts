import {describe, expect, test} from 'bun:test'
import {TimePoint} from '@wharfkit/antelope'
import {
    getModules,
    schedule,
    ServerContract,
    TaskType,
    type ServerTypes,
} from '@shipload/sdk'
import {
    laneFront,
    laneKind,
    laneLabel,
    laneSectionStatus,
    sortLaneKeysSemantic,
} from '../../src/lib/lane-presentation'

function moduleEntry(moduleType: 'gatherer' | 'loader' | 'crafter'): ServerTypes.module_entry {
    const item = getModules({moduleType, tier: 1})[0]
    expect(item).toBeDefined()
    return ServerContract.Types.module_entry.from({
        type: 0,
        installed: {item_id: item.id, stats: 0},
    })
}

function modulesFor(
    laneKey: number,
    moduleType: 'gatherer' | 'loader' | 'crafter'
): ServerTypes.module_entry[] {
    const modules: ServerTypes.module_entry[] = []
    modules[laneKey - 1] = moduleEntry(moduleType)
    return modules
}

function laneSchedule(started: string, duration_s: number[], type = TaskType.TRAVEL) {
    return {
        started: TimePoint.from(started),
        tasks: duration_s.map((duration) => ({type, duration_s: duration})),
    }
}

function bareStringLaneSchedule(started: string, duration_s: number[], type = TaskType.TRAVEL) {
    return {
        started,
        tasks: duration_s.map((duration) => ({type, duration_s: duration})),
    }
}

function lane(started: string, duration_s: number[], type = TaskType.TRAVEL) {
    return {
        laneKey: schedule.LANE_MOBILITY,
        schedule: laneSchedule(started, duration_s, type),
    }
}

describe('lane presentation labels', () => {
    test('labels mobility and barrier lanes in full and compact modes', () => {
        expect(laneLabel({}, schedule.LANE_MOBILITY)).toBe('mobility')
        expect(laneLabel({}, schedule.LANE_MOBILITY, {compact: true})).toBe('mob')
        expect(laneLabel({}, schedule.LANE_BARRIER)).toBe('barrier')
        expect(laneLabel({}, schedule.LANE_BARRIER, {compact: true})).toBe('barrier')
    })

    test('labels worker lanes by installed module capability', () => {
        expect(laneLabel({modules: modulesFor(1, 'gatherer')}, 1)).toBe('L1 gatherer')
        expect(laneLabel({modules: modulesFor(2, 'loader')}, 2)).toBe('L2 loader')
        expect(laneLabel({modules: modulesFor(3, 'crafter')}, 3)).toBe('L3 crafter')
    })

    test('falls back to generic worker labels without an installed module', () => {
        expect(laneLabel({}, 4)).toBe('L4 worker')
        expect(laneLabel({modules: [ServerContract.Types.module_entry.from({type: 0})]}, 1)).toBe(
            'L1 worker'
        )
    })
})

describe('lane presentation ordering and kind', () => {
    test('classifies lane keys by semantic kind', () => {
        expect(laneKind(schedule.LANE_MOBILITY)).toBe('mobility')
        expect(laneKind(7)).toBe('worker')
        expect(laneKind(schedule.LANE_BARRIER)).toBe('barrier')
    })

    test('sorts lane keys mobility first, workers ascending, barrier last', () => {
        expect(sortLaneKeysSemantic([255, 7, 0, 3, 1])).toEqual([0, 1, 3, 7, 255])
    })
})

describe('laneFront', () => {
    test('reports a waiting lane before its start time', () => {
        const front = laneFront(
            laneSchedule('2026-05-10T22:01:00.000', [60, 120]),
            new Date(Date.UTC(2026, 4, 10, 22, 0, 0))
        )

        expect(front).toEqual({
            status: 'waiting',
            activeIndex: -1,
            startsIn_s: 60,
            remaining_s: 60,
            totalRemaining_s: 240,
            progress: 0,
        })
    })

    test('reports the active front task and remaining lane tail', () => {
        const front = laneFront(
            laneSchedule('2026-05-10T22:00:00.000', [60, 120, 30]),
            new Date(Date.UTC(2026, 4, 10, 22, 1, 30))
        )

        expect(front).toEqual({
            status: 'active',
            activeIndex: 1,
            startsIn_s: 0,
            remaining_s: 90,
            totalRemaining_s: 120,
            progress: 0.25,
        })
    })

    test('treats bare timestamp strings as UTC', () => {
        const oldTimezone = process.env.TZ
        process.env.TZ = 'America/Los_Angeles'
        try {
            const front = laneFront(
                bareStringLaneSchedule('2026-05-10T22:00:00.000', [60]),
                new Date('2026-05-10T22:00:30.000Z')
            )

            expect(front).toMatchObject({
                status: 'active',
                activeIndex: 0,
                remaining_s: 30,
                totalRemaining_s: 30,
                progress: 0.5,
            })
        } finally {
            process.env.TZ = oldTimezone
        }
    })

    test('reports a complete lane as ready to resolve', () => {
        const front = laneFront(
            laneSchedule('2026-05-10T22:00:00.000', [60]),
            new Date(Date.UTC(2026, 4, 10, 22, 2, 0))
        )

        expect(front).toEqual({
            status: 'ready to resolve',
            activeIndex: -1,
            startsIn_s: 0,
            remaining_s: 0,
            totalRemaining_s: 0,
            progress: 1,
        })
    })
})

describe('laneSectionStatus', () => {
    test('passes through waiting and active front statuses', () => {
        expect(
            laneSectionStatus(
                lane('2026-05-10T22:01:00.000', [60]),
                new Date(Date.UTC(2026, 4, 10, 22, 0, 0))
            )
        ).toBe('waiting')
        expect(
            laneSectionStatus(
                lane('2026-05-10T22:00:00.000', [60]),
                new Date(Date.UTC(2026, 4, 10, 22, 0, 30))
            )
        ).toBe('active')
    })

    test('marks completed unresolved work ready to resolve', () => {
        expect(
            laneSectionStatus(
                lane('2026-05-10T22:00:00.000', [60]),
                new Date(Date.UTC(2026, 4, 10, 22, 2, 0))
            )
        ).toBe('ready to resolve')
    })

    test('marks an active lane ready to resolve when an earlier task is complete', () => {
        expect(
            laneSectionStatus(
                lane('2026-05-10T22:00:00.000', [60, 120]),
                new Date(Date.UTC(2026, 4, 10, 22, 1, 30))
            )
        ).toBe('ready to resolve')
    })

    test('marks empty or reserved-only completed lanes done', () => {
        expect(
            laneSectionStatus(
                lane('2026-05-10T22:00:00.000', []),
                new Date(Date.UTC(2026, 4, 10, 22, 2, 0))
            )
        ).toBe('done')
        expect(
            laneSectionStatus(
                lane('2026-05-10T22:00:00.000', [60], TaskType.RESERVED),
                new Date(Date.UTC(2026, 4, 10, 22, 2, 0))
            )
        ).toBe('done')
    })
})
