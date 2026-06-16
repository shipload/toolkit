import {describe, expect, test} from 'bun:test'
import {TimePoint, UInt64} from '@wharfkit/antelope'
import {ConstructionManager} from '../../src/managers/construction'
import {TaskType} from '../../src/types'
import {entityRef, makeHauler, makePlot, makeTask} from './construction-fixtures'

const PLOT_ID = 1101
const NOW = new Date('2026-06-02T10:00:00.000Z')

function buildTask(plotId: number, duration: number) {
    return makeTask({type: TaskType.BUILDPLOT, duration, target: entityRef('plot', plotId)})
}

describe('ConstructionManager.scheduledBuildFor (hold-driven)', () => {
    const mgr = new ConstructionManager({} as never)

    test('returns null when the plot has no build hold', () => {
        const plot = makePlot({id: PLOT_ID})
        expect(mgr.scheduledBuildFor(plot, [], NOW)).toBeNull()
    })

    test('reads queued timing from the build hold and builder BUILDPLOT task', () => {
        const plot = makePlot({
            id: PLOT_ID,
            build: {builderId: 4, completesAt: TimePoint.from('2026-06-02T10:17:10.000')},
        })
        const builder = makeHauler({
            id: 4,
            name: 'Ship #4',
            scheduleStart: TimePoint.from('2026-06-02T10:00:30.000'),
            tasks: [buildTask(PLOT_ID, 1000)],
        })
        const result = mgr.scheduledBuildFor(plot, [builder], NOW)
        expect(result).not.toBeNull()
        expect(result?.shipId.equals(UInt64.from(4))).toBe(true)
        expect(result?.shipName).toBe('Ship #4')
        expect(result?.hasStarted).toBe(false)
        expect(result?.startsAt).toBe(NOW.getTime() + 30_000)
        expect(result?.completesAt).toBe(NOW.getTime() + 1030_000)
        expect(result?.cancelable).toBe(true)
        expect(result?.blockingTaskCount).toBe(0)
    })

    test('reports hasStarted when the build start is in the past', () => {
        const plot = makePlot({
            id: PLOT_ID,
            build: {builderId: 5, completesAt: TimePoint.from('2026-06-02T10:09:00.000')},
        })
        const builder = makeHauler({
            id: 5,
            scheduleStart: TimePoint.from('2026-06-02T09:59:00.000'),
            tasks: [buildTask(PLOT_ID, 600)],
        })
        const result = mgr.scheduledBuildFor(plot, [builder], NOW)
        expect(result?.hasStarted).toBe(true)
        expect(result?.startsAt).toBe(NOW.getTime() - 60_000)
    })

    test('still reports the build after completesAt (awaiting resolve)', () => {
        const plot = makePlot({
            id: PLOT_ID,
            build: {builderId: 8, completesAt: TimePoint.from('2026-06-02T09:51:00.000')},
        })
        const builder = makeHauler({
            id: 8,
            scheduleStart: TimePoint.from('2026-06-02T09:50:00.000'),
            tasks: [buildTask(PLOT_ID, 60)],
        })
        const result = mgr.scheduledBuildFor(plot, [builder], NOW)
        expect(result).not.toBeNull()
        expect(result?.hasStarted).toBe(true)
    })

    test('not cancelable when the builder has tasks queued after the build', () => {
        const plot = makePlot({
            id: PLOT_ID,
            build: {builderId: 6, completesAt: TimePoint.from('2026-06-02T10:17:10.000')},
        })
        const builder = makeHauler({
            id: 6,
            tasks: [
                buildTask(PLOT_ID, 1000),
                makeTask({type: TaskType.TRAVEL, duration: 90}),
                makeTask({type: TaskType.GATHER, duration: 90}),
            ],
        })
        const result = mgr.scheduledBuildFor(plot, [builder], NOW)
        expect(result?.cancelable).toBe(false)
        expect(result?.blockingTaskCount).toBe(2)
    })

    test('builder not loaded: state renders, cancel disabled, name falls back to id', () => {
        const plot = makePlot({
            id: PLOT_ID,
            build: {builderId: 99, completesAt: TimePoint.from('2026-06-02T10:17:10.000')},
        })
        const result = mgr.scheduledBuildFor(plot, [], NOW)
        expect(result).not.toBeNull()
        expect(result?.shipName).toBe('99')
        expect(result?.cancelable).toBe(false)
        expect(result?.blockingTaskCount).toBe(0)
    })
})

describe('ConstructionManager.scheduledBuildsByTarget (hold-driven)', () => {
    const mgr = new ConstructionManager({} as never)

    test('keys built plots by plot id, ignores non-plots and unbuilt plots', () => {
        const reserved = makePlot({
            id: PLOT_ID,
            build: {builderId: 4, completesAt: TimePoint.from('2026-06-02T10:17:10.000')},
        })
        const idlePlot = makePlot({id: 1102})
        const builder = makeHauler({id: 4, name: 'Ship #4', tasks: [buildTask(PLOT_ID, 1000)]})
        const map = mgr.scheduledBuildsByTarget([reserved, idlePlot, builder], NOW)
        expect(map.size).toBe(1)
        expect(map.get(String(PLOT_ID))?.shipName).toBe('Ship #4')
        expect(map.has('1102')).toBe(false)
    })
})
