import {describe, expect, test} from 'bun:test'
import {schedule} from '$lib'
import {factory12} from './fixtures/factory-12'

const FAR_FUTURE = new Date('2030-01-01T00:00:00.000Z')

describe('lane-derived idle helpers', () => {
    test('isEntityIdle is false while any lane has an unfinished task', () => {
        const entity = factory12({incomingLoad: true})
        const now = new Date('2026-06-11T20:58:10.000Z')
        expect(schedule.isEntityIdle(entity, now)).toBeFalse()
    })

    test('isEntityIdle is true once every lane is fully resolved', () => {
        const entity = factory12({incomingLoad: true})
        expect(schedule.isEntityIdle(entity, FAR_FUTURE)).toBeTrue()
    })

    test('entityIdleAt returns the latest task completion across all lanes', () => {
        const entity = factory12({incomingLoad: true})
        const expected = schedule
            .orderedTasks(entity)
            .reduce((max, t) => Math.max(max, t.completesAt.getTime()), 0)
        const at = schedule.entityIdleAt(entity, new Date('2026-06-11T20:58:10.000Z'))
        expect(at).toBeInstanceOf(Date)
        expect(at!.getTime()).toBe(expected)
    })

    test('entityIdleAt is undefined for an entity with no lanes', () => {
        expect(schedule.entityIdleAt({lanes: []}, FAR_FUTURE)).toBeUndefined()
    })
})
