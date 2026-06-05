import {describe, expect, test} from 'bun:test'
import {TimePoint, UInt64} from '@wharfkit/antelope'
import {ConstructionManager} from '../../src/managers/construction'
import {TaskType} from '../../src/types'
import {entityRef, makeHauler, makeTask} from './construction-fixtures'

const PLOT_ID = UInt64.from(1101)
const plotRef = (id: UInt64 = PLOT_ID) => entityRef('plot', id)
const NOW = new Date('2026-06-02T10:00:00.000Z')

const build = (extra: {duration: number; target?: ReturnType<typeof plotRef>}) =>
    makeTask({
        type: TaskType.BUILDPLOT,
        duration: extra.duration,
        target: extra.target ?? plotRef(),
    })

describe('ConstructionManager.scheduledBuildFor', () => {
    const mgr = new ConstructionManager({} as never)

    test('returns null when no entity has a build targeting the plot', () => {
        const idle = makeHauler({id: 10})
        expect(mgr.scheduledBuildFor(PLOT_ID, [idle], NOW)).toBeNull()
    })

    test('finds a queued build and reports queued timing', () => {
        const ship = makeHauler({
            id: 4,
            name: 'Ship #4',
            tasks: [makeTask({type: TaskType.UNLOAD, duration: 500}), build({duration: 1000})],
        })
        const result = mgr.scheduledBuildFor(PLOT_ID, [ship], NOW)
        expect(result).not.toBeNull()
        expect(result?.shipId.equals(UInt64.from(4))).toBe(true)
        expect(result?.shipName).toBe('Ship #4')
        expect(result?.hasStarted).toBe(false)
        expect(result?.startsAt).toBe(NOW.getTime() + 500_000)
        expect(result?.completesAt).toBe(NOW.getTime() + 1500_000)
        expect(result?.trailingCancelCount).toBe(0)
    })

    test('reports hasStarted when the build is the active task', () => {
        const ship = makeHauler({
            id: 5,
            scheduleStart: TimePoint.from('2026-06-02T09:59:00.000'),
            tasks: [build({duration: 600})],
        })
        const result = mgr.scheduledBuildFor(PLOT_ID, [ship], NOW)
        expect(result?.hasStarted).toBe(true)
        expect(result?.startsAt).toBe(NOW.getTime() - 60_000)
    })

    test('trailingCancelCount counts tasks queued after the build', () => {
        const ship = makeHauler({
            id: 6,
            tasks: [
                build({duration: 1000}),
                makeTask({type: TaskType.TRAVEL, duration: 90}),
                makeTask({type: TaskType.GATHER, duration: 90}),
            ],
        })
        expect(mgr.scheduledBuildFor(PLOT_ID, [ship], NOW)?.trailingCancelCount).toBe(2)
    })

    test('ignores builds targeting a different plot', () => {
        const ship = makeHauler({
            id: 7,
            tasks: [build({duration: 1000, target: plotRef(UInt64.from(9999))})],
        })
        expect(mgr.scheduledBuildFor(PLOT_ID, [ship], NOW)).toBeNull()
    })

    test('skips a build whose projected completion is already in the past', () => {
        const ship = makeHauler({
            id: 8,
            scheduleStart: TimePoint.from('2026-06-02T09:50:00.000'),
            tasks: [build({duration: 60})],
        })
        expect(mgr.scheduledBuildFor(PLOT_ID, [ship], NOW)).toBeNull()
    })

    test('keeps the earliest-completing build when two ships target the same plot', () => {
        const slow = makeHauler({id: 20, name: 'Slow', tasks: [build({duration: 4000})]})
        const fast = makeHauler({id: 21, name: 'Fast', tasks: [build({duration: 1000})]})
        const result = mgr.scheduledBuildFor(PLOT_ID, [slow, fast], NOW)
        expect(result?.shipName).toBe('Fast')
    })
})
