import {describe, expect, it} from 'bun:test'
import {UInt8, UInt32, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {HoldKind} from '../types'
import type {OrderedTask, ScheduleData} from './schedule'
import {
    buildJobCancelRoute,
    hostedDropoff,
    jobCancelRoute,
    jobCancellationBlockReason,
    jobCancellable,
    jobDropoffTask,
    jobStatus,
    jobStatusLabel,
    pickupsInFlight,
    splitJobCargo,
    workshopAvailability,
    type JobWindow,
} from './jobs'

const at = (s: string) => new Date(s)
const WITH_MODULES = [{item_id: 101, stats: '413333752', quantity: 10, modules: []}] as never

const INPUTS = [{item_id: 101, stats: '413333752', quantity: 10}] as never
const FULL_INPUT = {
    item_id: 101,
    stats: '413333752',
    modules: [{type: 1, installed: {item_id: 301, stats: '9'}}],
    quantity: 10,
    entity_id: '77',
}
const FULL_INPUTS = [FULL_INPUT] as never

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
    it('finds the Drop-off task the card reads its landing time from', () => {
        const dropoff = task({
            type: 21,
            building: 42,
            startsAt: at('2026-07-26T09:30:00Z'),
            completesAt: at('2026-07-26T09:50:00Z'),
        })
        const other = task({
            type: 22,
            building: 42,
            startsAt: at('2026-07-26T09:00:00Z'),
            completesAt: at('2026-07-26T09:10:00Z'),
        })
        expect(jobDropoffTask(inFlight, [other, dropoff])).toBe(dropoff)
        expect(jobDropoffTask(inFlight, [other])).toBeUndefined()
        expect(jobDropoffTask(inFlight, undefined)).toBeUndefined()
    })
    it('uses the authoritative arrival to select one of two identical Drop-offs', () => {
        const first = task({
            type: 21,
            building: 42,
            startsAt: at('2026-07-26T09:10:00Z'),
            completesAt: at('2026-07-26T09:20:00Z'),
        })
        const second = {
            ...task({
                type: 21,
                building: 42,
                startsAt: at('2026-07-26T09:20:00Z'),
                completesAt: at('2026-07-26T09:30:00Z'),
            }),
            taskIndex: 1,
        }
        expect(jobDropoffTask({...inFlight, arrivesAt: second.completesAt}, [first, second])).toBe(
            second
        )
    })
    it('matches modules and entity identity and refuses an ambiguous match', () => {
        const exact = task({
            type: 21,
            building: 42,
            cargo: FULL_INPUTS,
            startsAt: at('2026-07-26T09:10:00Z'),
            completesAt: at('2026-07-26T09:20:00Z'),
        })
        const differentEntity = task({
            type: 21,
            building: 42,
            cargo: [{...FULL_INPUT, entity_id: '78'}],
            startsAt: exact.startsAt,
            completesAt: exact.completesAt,
        })
        expect(jobDropoffTask({...inFlight, inputs: FULL_INPUTS}, [differentEntity, exact])).toBe(
            exact
        )
        expect(
            jobDropoffTask({...inFlight, inputs: FULL_INPUTS}, [exact, {...exact}])
        ).toBeUndefined()
    })
    it('normalizes bare module layouts and absent entity identity like the contract', () => {
        const bare = task({
            type: 21,
            building: 42,
            cargo: [{item_id: 101, stats: '413333752', modules: [], quantity: 10}],
            startsAt: at('2026-07-26T09:10:00Z'),
            completesAt: at('2026-07-26T09:20:00Z'),
        })
        const padded = [
            {
                item_id: 101,
                stats: '413333752',
                modules: [{type: 6, installed: undefined}],
                quantity: 10,
                entity_id: 0,
            },
        ] as never
        expect(jobDropoffTask({...inFlight, inputs: padded}, [bare])).toBe(bare)
    })
    it('reads an undeposited row as dropping off when no schedule is given', () => {
        expect(jobStatus(inFlight, at('2026-07-26T09:00:00Z'))).toBe('dropping')
    })
    it('finds the Drop-off of a booking-time undeposited job from its inputs-only cargo', () => {
        const input = {item_id: 1, stats: '0', quantity: 5, modules: [], entity_id: undefined}
        const {inputs} = splitJobCargo([input], false, 1)
        const dropoff = task({
            type: 21,
            building: 7,
            cargo: [input],
            startsAt: at('2026-07-26T00:00:00Z'),
            completesAt: at('2026-07-26T00:00:01Z'),
        })
        expect(
            jobDropoffTask(
                {
                    startsAt: new Date(0),
                    completesAt: new Date(0),
                    building: 7,
                    inputs: inputs as never,
                },
                [dropoff]
            )
        ).toBe(dropoff)
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

describe('jobCancelRoute', () => {
    const job = {
        id: 7,
        shipId: 5,
        startsAt: at('2026-07-26T10:00:00Z'),
        completesAt: at('2026-07-26T11:00:00Z'),
        deposited: true,
        quantity: 1,
        building: 42,
        inputs: INPUTS,
    }
    const inFlight = {...job, deposited: false}
    const dropoff = task({
        type: 21,
        building: 42,
        startsAt: at('2026-07-26T09:30:00Z'),
        completesAt: at('2026-07-26T09:50:00Z'),
    })

    it('cancels a Booked job through the ship, from the Drop-off to the lane tail', () => {
        const later = {
            ...dropoff,
            taskIndex: 1,
            task: {...dropoff.task, type: 22},
        } as unknown as OrderedTask
        const route = jobCancelRoute(inFlight, at('2026-07-26T09:00:00Z'), [dropoff, later])
        expect(route).toEqual({kind: 'dropoff', shipId: 5, laneKey: 1, count: 2})
    })
    it('cancels from the selected identical Drop-off and leaves the earlier booking intact', () => {
        const first = {...dropoff, completesAt: at('2026-07-26T09:20:00Z')}
        const second = {
            ...dropoff,
            taskIndex: 1,
            startsAt: at('2026-07-26T09:20:00Z'),
            completesAt: at('2026-07-26T09:30:00Z'),
        }
        expect(
            jobCancelRoute(
                {...inFlight, arrivesAt: second.completesAt},
                at('2026-07-26T09:00:00Z'),
                [first, second]
            )
        ).toEqual({kind: 'dropoff', shipId: 5, laneKey: 1, count: 1})
    })
    it('cancels a Dropping off job through the ship while the transfer is in flight', () => {
        const route = jobCancelRoute(inFlight, at('2026-07-26T09:40:00Z'), [dropoff])
        expect(route).toEqual({kind: 'dropoff', shipId: 5, laneKey: 1, count: 1})
    })
    it('counts only the Drop-off lane, not tasks on other lanes', () => {
        const mobility = {
            ...dropoff,
            laneKey: 0,
            taskIndex: 0,
            task: {...dropoff.task, type: 1},
        } as unknown as OrderedTask
        const route = jobCancelRoute(inFlight, at('2026-07-26T09:00:00Z'), [mobility, dropoff])
        expect(route).toEqual({kind: 'dropoff', shipId: 5, laneKey: 1, count: 1})
    })
    it('cancels a Queued job through cancelcraft', () => {
        expect(jobCancelRoute(job, at('2026-07-26T09:59:59Z'))).toEqual({kind: 'craft', jobId: 7})
    })
    it('routes a bay-hosted drop-off cancel through cancelcivic when the task is the lane tail and not yet completed', () => {
        const route = jobCancelRoute(inFlight, at('2026-07-26T09:00:00Z'), [], {
            hosted: {hostId: 90000, laneKey: 1, taskIndex: 0, civic: true},
            hostedTask: dropoff,
            hostLaneLength: 1,
        })
        expect(route).toEqual({kind: 'civic', buildingId: 90000, laneKey: 1, fromId: 5})
    })
    it('refuses a bay-hosted civic cancel once the hosted task has completed', () => {
        const route = jobCancelRoute(inFlight, at('2026-07-26T10:00:00Z'), [], {
            hosted: {hostId: 90000, laneKey: 1, taskIndex: 0, civic: true},
            hostedTask: dropoff,
            hostLaneLength: 1,
        })
        expect(route).toBeNull()
    })
    it('refuses a bay-hosted civic cancel when the hosted task is not the lane tail', () => {
        const route = jobCancelRoute(inFlight, at('2026-07-26T09:00:00Z'), [], {
            hosted: {hostId: 90000, laneKey: 1, taskIndex: 0, civic: true},
            hostedTask: dropoff,
            hostLaneLength: 2,
        })
        expect(route).toBeNull()
    })
    it('routes a third-party-hosted drop-off cancel through the carrier ship', () => {
        const route = jobCancelRoute(inFlight, at('2026-07-26T09:00:00Z'), [], {
            hosted: {hostId: 8, laneKey: 2, taskIndex: 0, civic: false},
            hostLaneLength: 3,
        })
        expect(route).toEqual({kind: 'dropoff', shipId: 8, laneKey: 2, count: 3})
    })
    it('refuses only deposited positive-quantity output-only legacy jobs', () => {
        const legacy = {...job, inputs: []}
        expect(jobCancellationBlockReason(legacy)).toBe('legacy-inputs-unavailable')
        expect(jobCancelRoute(legacy, at('2026-07-26T09:59:59Z'))).toBeNull()
        expect(jobCancellationBlockReason({...legacy, deposited: false})).toBeNull()
        expect(jobCancellationBlockReason({...legacy, quantity: 0})).toBeNull()
        expect(jobCancellationBlockReason({...legacy, inputs: undefined})).toBeNull()
        expect(jobCancellationBlockReason({...legacy, inputs: [FULL_INPUTS[0]]})).toBeNull()
    })
    it('refuses an existing exact-arrival tie rather than choosing either Drop-off', () => {
        const tied = {...inFlight, arrivesAt: dropoff.completesAt}
        expect(jobCancellationBlockReason(tied, [dropoff, {...dropoff}])).toBe('ambiguous-dropoff')
        expect(jobCancelRoute(tied, at('2026-07-26T09:00:00Z'), [dropoff, {...dropoff}])).toBeNull()
    })
    it('has no route once crafting has started or the job is ready', () => {
        expect(jobCancelRoute(job, at('2026-07-26T10:00:00Z'))).toBeNull()
        expect(jobCancelRoute(job, at('2026-07-26T11:00:00Z'))).toBeNull()
        expect(jobCancelRoute({...job, quantity: 0}, at('2026-07-26T09:00:00Z'))).toBeNull()
    })
    it('has no route for a landed Drop-off that has not resolved yet', () => {
        expect(jobCancelRoute(inFlight, at('2026-07-26T09:50:00Z'), [dropoff])).toBeNull()
    })
    it('has no route for an undeposited job without the ship schedule', () => {
        expect(jobCancelRoute(inFlight, at('2026-07-26T09:00:00Z'))).toBeNull()
        expect(
            jobCancelRoute({...inFlight, shipId: undefined}, at('2026-07-26T09:00:00Z'), [dropoff])
        ).toBeNull()
    })
    it('names the three cancellable phases', () => {
        expect(jobCancellable('booked')).toBe(true)
        expect(jobCancellable('dropping')).toBe(true)
        expect(jobCancellable('queued')).toBe(true)
        expect(jobCancellable('crafting')).toBe(false)
        expect(jobCancellable('ready')).toBe(false)
        expect(jobCancellable('pickingup')).toBe(false)
    })
})

describe('buildJobCancelRoute', () => {
    const job = {
        id: 3,
        targetId: 9,
        startsAt: at('2026-07-26T10:00:00Z'),
        completesAt: at('2026-07-26T11:00:00Z'),
        deposited: true,
        building: 42,
        inputs: INPUTS,
    }
    const inFlight = {...job, deposited: false}
    const dropoff = task({
        type: 21,
        building: 42,
        startsAt: at('2026-07-26T09:30:00Z'),
        completesAt: at('2026-07-26T09:50:00Z'),
    })

    it('cancels a Booked or Dropping off build through the target, from the Drop-off to the lane tail', () => {
        expect(buildJobCancelRoute(inFlight, at('2026-07-26T09:00:00Z'), [dropoff])).toEqual({
            kind: 'dropoff',
            shipId: 9,
            laneKey: 1,
            count: 1,
        })
        expect(buildJobCancelRoute(inFlight, at('2026-07-26T09:40:00Z'), [dropoff])).toEqual({
            kind: 'dropoff',
            shipId: 9,
            laneKey: 1,
            count: 1,
        })
    })
    it('cancels a Queued build through cancelbuild', () => {
        expect(buildJobCancelRoute(job, at('2026-07-26T09:59:59Z'))).toEqual({
            kind: 'build',
            jobId: 3,
        })
    })
    it('has no route once the build has started or finished', () => {
        expect(buildJobCancelRoute(job, at('2026-07-26T10:00:00Z'))).toBeNull()
        expect(buildJobCancelRoute(job, at('2026-07-26T11:00:00Z'))).toBeNull()
    })
    it('has no route for an undeposited build without the target schedule', () => {
        expect(buildJobCancelRoute(inFlight, at('2026-07-26T09:00:00Z'))).toBeNull()
        expect(
            buildJobCancelRoute({...inFlight, targetId: undefined}, at('2026-07-26T09:00:00Z'), [
                dropoff,
            ])
        ).toBeNull()
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
    it('reads an undeposited row whose input is booked as more than one stack per recipe slot', () => {
        const stackA1 = {item_id: 1, quantity: 2}
        const stackA2 = {item_id: 1, quantity: 1}
        const stackB = {item_id: 2, quantity: 4}
        const cargo = [stackA1, stackA2, stackB] as unknown as Parameters<typeof splitJobCargo>[0]
        const {output, inputs} = splitJobCargo(cargo, false, 1)
        expect(output).toBeNull()
        expect(inputs).toEqual([stackA1, stackA2, stackB] as never)
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

describe('hostedDropoff', () => {
    function hostWithDeposit(
        entityType: string,
        building: number,
        holdId: number,
        owner = 'nex.shipload'
    ): ScheduleData & {owner: string} {
        return {
            owner,
            lanes: [
                ServerContract.Types.lane.from({
                    lane_key: UInt8.from(1),
                    schedule: {
                        started: '2026-07-26T09:00:00.000',
                        tasks: [
                            {
                                type: UInt8.from(21),
                                duration: UInt32.from(600),
                                cancelable: UInt8.from(2),
                                cargo: WITH_MODULES,
                                couplings: [
                                    {
                                        counterpart: {entity_type: 'ship', entity_id: 5},
                                        hold: holdId,
                                        kind: HoldKind.PULL,
                                    },
                                ],
                                subject: {entity_type: entityType, entity_id: building},
                            },
                        ],
                    },
                }),
            ],
        }
    }

    function sourceWithHold(hostId: number, hostType: string, holdId: number): ScheduleData {
        return {
            holds: [
                ServerContract.Types.hold.from({
                    id: holdId,
                    kind: HoldKind.PULL,
                    counterpart: {entity_type: hostType, entity_id: hostId},
                    until: '2026-07-26T09:50:00.000',
                    incoming_mass: 0,
                }),
            ],
        }
    }

    const job = {
        building: 42,
        inputs: WITH_MODULES,
        startsAt: at('2026-07-26T10:00:00Z'),
        completesAt: at('2026-07-26T11:00:00Z'),
    }

    it('finds the carrier hosting a bay-hosted Drop-off and flags it civic', () => {
        const host = hostWithDeposit('depot', 42, 3, 'nex.shipload')
        const source = sourceWithHold(90000, 'depot', 3)
        const lookup = (id: string) => (id === '90000' ? host : undefined)
        const result = hostedDropoff(source, lookup, job, 'nex.shipload')
        expect(result).toMatchObject({hostId: 90000, laneKey: 1, taskIndex: 0, civic: true})
    })

    it('does not flag a player-owned Depot civic', () => {
        const host = hostWithDeposit('depot', 42, 3, 'alice')
        const source = sourceWithHold(90000, 'depot', 3)
        const lookup = (id: string) => (id === '90000' ? host : undefined)
        const result = hostedDropoff(source, lookup, job, 'nex.shipload')
        expect(result).toMatchObject({hostId: 90000, laneKey: 1, taskIndex: 0, civic: false})
    })

    it('finds a third-party carrier and does not flag it civic', () => {
        const host = hostWithDeposit('ship', 42, 3, 'alice')
        const source = sourceWithHold(8, 'ship', 3)
        const lookup = (id: string) => (id === '8' ? host : undefined)
        const result = hostedDropoff(source, lookup, job, 'nex.shipload')
        expect(result).toMatchObject({hostId: 8, laneKey: 1, taskIndex: 0, civic: false})
    })

    it('returns undefined when no PULL hold names a matching host task', () => {
        expect(hostedDropoff({holds: []}, () => undefined, job)).toBeUndefined()
        const host = hostWithDeposit('depot', 99, 3)
        const source = sourceWithHold(90000, 'depot', 3)
        const lookup = (id: string) => (id === '90000' ? host : undefined)
        expect(hostedDropoff(source, lookup, job)).toBeUndefined()
    })

    it('does not match a Drop-off whose arrival differs from the job', () => {
        const host = hostWithDeposit('depot', 42, 3, 'nex.shipload')
        const source = sourceWithHold(90000, 'depot', 3)
        const lookup = (id: string) => (id === '90000' ? host : undefined)
        const result = hostedDropoff(
            source,
            lookup,
            {...job, arrivesAt: at('2026-07-26T12:00:00Z')},
            'nex.shipload'
        )
        expect(result).toBeUndefined()
    })
})
