import {describe, expect, test} from 'bun:test'
import {jobsToLanes, pickFabricator} from '../src/scheduling/jobs'

const now = new Date('2026-07-11T12:00:00Z')
const at = (m: number) => new Date(now.getTime() + m * 60_000)
const job = (socket: number, s: number, e: number, id = 1) => ({
    id,
    socket,
    owner: 'alice',
    startsAt: at(s),
    completesAt: at(e),
    recipeId: 10001,
    quantity: 1,
})

describe('jobsToLanes', () => {
    test('one lane per socket, gaps become idle entries, expired windows dropped', () => {
        const lanes = jobsToLanes([job(0, -60, -30), job(0, 0, 60), job(0, 90, 120)], 2, now)
        expect(lanes.length).toBe(2)
        const kinds = lanes[0].entries.map((e) => e.kind)
        expect(kinds).toEqual(['job', 'idle', 'job'])
        expect(lanes[1].entries).toEqual([])
    })
})

describe('pickFabricator', () => {
    test('picks earliest completion across open sockets with differing durations', () => {
        const jobs = [job(0, 0, 120)]
        const pick = pickFabricator(jobs, [{open: true}, {open: true}], [30, 45], now)
        expect(pick?.slot).toBe(1)
        expect(pick?.completesAt.getTime()).toBe(at(45).getTime())
    })

    test('skips closed sockets and full queues; null when nothing bookable', () => {
        const full = Array.from({length: 25}, (_, i) => job(0, i * 10, i * 10 + 9, i))
        expect(pickFabricator(full, [{open: true}], [30], now)).toBeNull()
        expect(pickFabricator([], [{open: false}], [30], now)).toBeNull()
    })

    test('tie on completion goes to the lowest slot index', () => {
        const pick = pickFabricator([], [{open: true}, {open: true}], [30, 30], now)
        expect(pick?.slot).toBe(0)
    })
})
