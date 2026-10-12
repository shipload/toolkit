import {describe, expect, test} from 'bun:test'
import {JOB_QUEUE_CAP, jobsToLanes, pickFabricator, type JobWindow} from '../src/scheduling/jobs'

const now = new Date('2026-07-11T12:00:00Z')
const at = (m: number) => new Date(now.getTime() + m * 60_000)
const job = (
    socket: number,
    s: number,
    e: number,
    id = 1,
    over: {arrivesAt?: Date; deposited?: boolean} = {}
): JobWindow => ({
    id,
    socket,
    owner: 'alice',
    startsAt: at(s),
    completesAt: at(e),
    recipeId: 10001,
    quantity: 1,
    deposited: over.deposited ?? false,
    arrivesAt: over.arrivesAt,
})

// A socket filled to the cap with back-to-back ten-minute windows, each arriving as it starts.
const fullSocket = (socket: number, firstId: number, arrival?: (i: number) => Date) =>
    Array.from({length: JOB_QUEUE_CAP}, (_, i) =>
        job(socket, i * 10, i * 10 + 10, firstId + i, {
            arrivesAt: arrival ? arrival(i) : at(i * 10),
        })
    )

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
    test('uses the first internal gap after arrival instead of the socket tail', () => {
        const jobs = [job(0, -120, -60), job(0, 0, 60), job(0, 120, 180)]
        const pick = pickFabricator(jobs, [{open: true}], [30], at(0), now)
        expect(pick).toEqual({slot: 0, startsAt: at(60), completesAt: at(90)})
    })

    test('counts active jobs at actual now rather than the future arrival', () => {
        const full = Array.from({length: JOB_QUEUE_CAP}, (_, i) => job(0, i, 300 + i, i))
        expect(pickFabricator(full, [{open: true}], [30], at(600), now)).toBeNull()
    })

    test('a socket holds fifty windows before it is full', () => {
        expect(JOB_QUEUE_CAP).toBe(50)
        const under = Array.from({length: JOB_QUEUE_CAP - 1}, (_, i) => job(0, i, 300 + i, i))
        expect(pickFabricator(under, [{open: true}], [30], at(600), now)?.slot).toBe(0)
        const full = [...under, job(0, 49, 349, 49)]
        expect(pickFabricator(full, [{open: true}], [30], at(600), now)).toBeNull()
    })

    test('picks earliest completion across open sockets with differing durations', () => {
        const jobs = [job(0, 0, 120)]
        const pick = pickFabricator(jobs, [{open: true}, {open: true}], [30, 45], now)
        expect(pick?.slot).toBe(1)
        expect(pick?.completesAt.getTime()).toBe(at(45).getTime())
    })

    test('skips closed sockets and full queues; null when nothing bookable', () => {
        const full = Array.from({length: JOB_QUEUE_CAP}, (_, i) => job(0, i * 10, i * 10 + 9, i))
        expect(pickFabricator(full, [{open: true}], [30], now)).toBeNull()
        expect(pickFabricator([], [{open: false}], [30], now)).toBeNull()
    })

    test('tie on completion goes to the lowest slot index', () => {
        const pick = pickFabricator([], [{open: true}, {open: true}], [30, 30], now)
        expect(pick?.slot).toBe(0)
    })

    test('a full socket bumps the latest-arriving booked job for an earlier arrival', () => {
        const pick = pickFabricator(fullSocket(0, 0), [{open: true}], [10], at(200), now)
        expect(pick).toEqual({
            slot: 0,
            startsAt: at(490),
            completesAt: at(500),
            bumped: 49,
        })
    })

    test('an equal or later arrival is refused', () => {
        const jobs = fullSocket(0, 0, () => at(100))
        expect(pickFabricator(jobs, [{open: true}], [10], at(100), now)).toBeNull()
        expect(pickFabricator(jobs, [{open: true}], [10], at(150), now)).toBeNull()
        expect(pickFabricator(jobs, [{open: true}], [10], at(99), now)?.bumped).toBe(49)
    })

    test('a deposited window is never the bump target', () => {
        const jobs = fullSocket(0, 0)
        jobs[49].deposited = true
        const pick = pickFabricator(jobs, [{open: true}], [10], at(200), now)
        expect(pick?.bumped).toBe(48)
        expect(pick?.startsAt).toEqual(at(480))

        const allDeposited = fullSocket(0, 0).map((j) => ({...j, deposited: true}))
        expect(pickFabricator(allDeposited, [{open: true}], [10], at(200), now)).toBeNull()
    })

    test('a window already arrived by now is never the bump target', () => {
        const landed = Array.from({length: JOB_QUEUE_CAP}, (_, i) =>
            job(0, -60 + i, 300 + i, i, {arrivesAt: at(-5)})
        )
        expect(pickFabricator(landed, [{open: true}], [10], at(-10), now)).toBeNull()
    })

    test('a window with no recorded arrival is never the bump target', () => {
        const unknown = Array.from({length: JOB_QUEUE_CAP}, (_, i) =>
            job(0, i * 10, i * 10 + 10, i)
        )
        expect(pickFabricator(unknown, [{open: true}], [10], at(200), now)).toBeNull()
    })

    test('ties on arrival go to the highest job id', () => {
        const jobs = fullSocket(0, 0, (i) => (i === 10 || i === 11 ? at(100) : at(0)))
        expect(pickFabricator(jobs, [{open: true}], [10], at(50), now)?.bumped).toBe(11)
    })

    test('the bump target is the latest arrival across every open socket', () => {
        const jobs = [
            ...fullSocket(0, 0, () => at(100)),
            ...fullSocket(1, 100, (i) => (i === 7 ? at(300) : at(100))),
        ]
        const pick = pickFabricator(jobs, [{open: true}, {open: true}], [10, 10], at(50), now)
        expect(pick?.slot).toBe(1)
        expect(pick?.bumped).toBe(107)
    })

    test('a closed socket holds no bump target', () => {
        const jobs = fullSocket(0, 0)
        expect(pickFabricator(jobs, [{open: false}], [10], at(200), now)).toBeNull()
    })
})
