import {describe, expect, it} from 'bun:test'
import type {OrderedTask} from './schedule'
import {
    jobStatus,
    jobStatusLabel,
    pickupsInFlight,
    splitJobCargo,
    workshopAvailability,
    type JobWindow,
} from './jobs'

const at = (s: string) => new Date(s)

const INPUTS = [{item_id: 101, stats: '413333752', quantity: 10}] as never

function task(over: {
    type: number
    building: number
    cargo?: unknown
    startsAt: Date
    completesAt: Date
}): OrderedTask {
    return {
        laneKey: 1,
        taskIndex: 0,
        startsAt: over.startsAt,
        completesAt: over.completesAt,
        task: {
            type: over.type,
            subject: {entity_id: over.building},
            cargo: over.cargo ?? INPUTS,
        },
    } as unknown as OrderedTask
}

describe('jobStatus', () => {
    const job = {
        startsAt: at('2026-07-26T10:00:00Z'),
        completesAt: at('2026-07-26T11:00:00Z'),
        deposited: true,
        quantity: 1,
        building: 42,
        inputs: INPUTS,
    }
    const inFlight = {...job, deposited: false}

    it('is queued once deposited and before startsAt', () => {
        expect(jobStatus(job, at('2026-07-26T09:59:59Z'))).toBe('queued')
    })
    it('is crafting between startsAt and completesAt', () => {
        expect(jobStatus(job, at('2026-07-26T10:30:00Z'))).toBe('crafting')
    })
    it('is ready at or after completesAt', () => {
        expect(jobStatus(job, at('2026-07-26T11:00:00Z'))).toBe('ready')
        expect(jobStatus(job, at('2026-07-26T12:00:00Z'))).toBe('ready')
    })
    it('is ready when the job was cancelled and holds its inputs', () => {
        expect(jobStatus({...job, quantity: 0}, at('2026-07-26T09:00:00Z'))).toBe('ready')
    })
    it('is booked while the matching Drop-off task has not started', () => {
        const tasks = [
            task({
                type: 21,
                building: 42,
                startsAt: at('2026-07-26T09:30:00Z'),
                completesAt: at('2026-07-26T09:50:00Z'),
            }),
        ]
        expect(jobStatus(inFlight, at('2026-07-26T09:00:00Z'), tasks)).toBe('booked')
    })
    it('is dropping off once the Drop-off task has started', () => {
        const tasks = [
            task({
                type: 21,
                building: 42,
                startsAt: at('2026-07-26T09:30:00Z'),
                completesAt: at('2026-07-26T09:50:00Z'),
            }),
        ]
        expect(jobStatus(inFlight, at('2026-07-26T09:30:00Z'), tasks)).toBe('dropping')
    })
    it('matches the Drop-off by building and cargo, not by any deposit task', () => {
        const tasks = [
            task({
                type: 21,
                building: 42,
                cargo: [{item_id: 999, stats: '1', quantity: 1}],
                startsAt: at('2026-07-26T09:00:00Z'),
                completesAt: at('2026-07-26T09:10:00Z'),
            }),
            task({
                type: 21,
                building: 42,
                startsAt: at('2026-07-26T09:10:00Z'),
                completesAt: at('2026-07-26T09:20:00Z'),
            }),
        ]
        expect(jobStatus(inFlight, at('2026-07-26T09:05:00Z'), tasks)).toBe('booked')
    })
    it('reads an undeposited row as dropping off when no schedule is given', () => {
        expect(jobStatus(inFlight, at('2026-07-26T09:00:00Z'))).toBe('dropping')
    })
    it('labels every phase', () => {
        expect(jobStatusLabel('booked')).toBe('Booked')
        expect(jobStatusLabel('dropping')).toBe('Dropping off')
        expect(jobStatusLabel('queued')).toBe('Queued')
        expect(jobStatusLabel('crafting')).toBe('Crafting')
        expect(jobStatusLabel('ready')).toBe('Ready for Pickup')
        expect(jobStatusLabel('pickingup')).toBe('Picking up')
    })
})

describe('pickupsInFlight', () => {
    it('lists the civic withdraw tasks bound for a building', () => {
        const tasks = [
            task({
                type: 22,
                building: 42,
                cargo: [{item_id: 10001, stats: '5', quantity: 1}],
                startsAt: at('2026-07-26T09:00:00Z'),
                completesAt: at('2026-07-26T09:10:00Z'),
            }),
            task({
                type: 21,
                building: 42,
                startsAt: at('2026-07-26T09:10:00Z'),
                completesAt: at('2026-07-26T09:20:00Z'),
            }),
            task({
                type: 22,
                building: 7,
                startsAt: at('2026-07-26T09:20:00Z'),
                completesAt: at('2026-07-26T09:30:00Z'),
            }),
        ]
        const pickups = pickupsInFlight(tasks, 42)
        expect(pickups).toHaveLength(1)
        expect(pickups[0].building).toBe(42)
        expect(pickups[0].completesAt).toEqual(at('2026-07-26T09:10:00Z'))
        expect(pickups[0].cargo).toEqual([{item_id: 10001, stats: '5', quantity: 1}] as never)
    })
})

describe('splitJobCargo', () => {
    it('reads an undeposited row as inputs with no output', () => {
        const cargo = [{n: 'a'}, {n: 'b'}] as unknown as Parameters<typeof splitJobCargo>[0]
        const {output, inputs} = splitJobCargo(cargo, false, 1)
        expect(output).toBeNull()
        expect(inputs).toEqual([{n: 'a'}, {n: 'b'}] as never)
    })
    it('reads a deposited row as inputs followed by the output tail', () => {
        const cargo = [{n: 'a'}, {n: 'out'}] as unknown as Parameters<typeof splitJobCargo>[0]
        const {output, inputs} = splitJobCargo(cargo, true, 1)
        expect(output).toEqual({n: 'out'} as never)
        expect(inputs).toEqual([{n: 'a'}] as never)
    })
    it('reads a legacy deposited row holding only its output', () => {
        const cargo = [{n: 'out'}] as unknown as Parameters<typeof splitJobCargo>[0]
        const {output, inputs} = splitJobCargo(cargo, true, 1)
        expect(output).toEqual({n: 'out'} as never)
        expect(inputs).toEqual([] as never)
    })
    it('reads a cancelled row as inputs held for pickup', () => {
        const cargo = [{n: 'a'}, {n: 'b'}] as unknown as Parameters<typeof splitJobCargo>[0]
        const {output, inputs} = splitJobCargo(cargo, true, 0)
        expect(output).toBeNull()
        expect(inputs).toEqual([{n: 'a'}, {n: 'b'}] as never)
    })
    it('returns null output for empty cargo', () => {
        expect(splitJobCargo([], true, 1)).toEqual({output: null, inputs: []})
        expect(splitJobCargo([], false, 1)).toEqual({output: null, inputs: []})
    })
})

describe('workshopAvailability', () => {
    const win = (socket: number, s: string, e: string): JobWindow => ({
        id: 1,
        socket,
        owner: 'x',
        startsAt: at(s),
        completesAt: at(e),
        recipeId: 1,
        quantity: 1,
        deposited: true,
    })
    const now = at('2026-07-26T10:00:00Z')

    it('counts sockets with no live window as open now', () => {
        const jobs = [win(0, '2026-07-26T09:00:00Z', '2026-07-26T11:00:00Z')]
        expect(workshopAvailability(jobs, 3, now)).toEqual({open: 2, nextOpeningAt: null})
    })
    it('reports the earliest tail when every socket is booked', () => {
        const jobs = [
            win(0, '2026-07-26T09:00:00Z', '2026-07-26T11:00:00Z'),
            win(1, '2026-07-26T09:00:00Z', '2026-07-26T10:40:00Z'),
        ]
        expect(workshopAvailability(jobs, 2, now)).toEqual({
            open: 0,
            nextOpeningAt: at('2026-07-26T10:40:00Z'),
        })
    })
    it('ignores ended windows', () => {
        const jobs = [win(0, '2026-07-26T08:00:00Z', '2026-07-26T09:00:00Z')]
        expect(workshopAvailability(jobs, 1, now)).toEqual({open: 1, nextOpeningAt: null})
    })
})
