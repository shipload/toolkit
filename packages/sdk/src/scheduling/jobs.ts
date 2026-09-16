import type {ServerContract} from '../contracts'
import {TaskType} from '../types'
import type {OrderedTask} from './schedule'

type CargoItem = ServerContract.Types.cargo_item

export interface JobWindow {
    id: number
    socket: number
    owner: string
    startsAt: Date
    completesAt: Date
    /** Contract-recorded completion of the input Drop-off. */
    arrivesAt?: Date
    recipeId: number
    quantity: number
    /** False while the job's inputs are still in transit to the building. */
    deposited: boolean
    /** Packed stat roll of the job's output, when the source carried the job's cargo. */
    outputStats?: bigint
    /** Ship that booked the job; lets a caller find its Drop-off on that ship's schedule. */
    shipId?: number
    /** Inputs the Drop-off carries; matched against the task cargo to find the right Drop-off. */
    inputs?: CargoItem[]
}

export interface JobLaneEntry {
    kind: 'idle' | 'job'
    startsAt: Date
    completesAt: Date
    job?: JobWindow
}

export interface JobLane {
    socket: number
    entries: JobLaneEntry[]
}

export const JOB_QUEUE_CAP = 25

function activeOn(jobs: JobWindow[], socket: number, now: Date): JobWindow[] {
    return jobs
        .filter((j) => j.socket === socket && j.completesAt > now)
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
}

export function jobsToLanes(jobs: JobWindow[], socketCount: number, now: Date): JobLane[] {
    const lanes: JobLane[] = []
    for (let socket = 0; socket < socketCount; socket++) {
        const entries: JobLaneEntry[] = []
        let cursor: Date | null = null
        for (const j of activeOn(jobs, socket, now)) {
            if (cursor && j.startsAt > cursor) {
                entries.push({kind: 'idle', startsAt: cursor, completesAt: j.startsAt})
            }
            entries.push({kind: 'job', startsAt: j.startsAt, completesAt: j.completesAt, job: j})
            cursor = j.completesAt
        }
        lanes.push({socket, entries})
    }
    return lanes
}

export function socketTail(jobs: JobWindow[], socket: number, now: Date): Date {
    const active = activeOn(jobs, socket, now)
    const last = active[active.length - 1]
    return last && last.completesAt > now ? last.completesAt : now
}

// Display-only estimate of the window a booking would receive; the contract picks the socket.
export function pickFabricator(
    jobs: JobWindow[],
    sockets: Array<{open: boolean}>,
    durationBySocketMinutes: number[],
    now: Date
): {slot: number; startsAt: Date; completesAt: Date} | null {
    let best: {slot: number; startsAt: Date; completesAt: Date} | null = null
    for (let slot = 0; slot < sockets.length; slot++) {
        if (!sockets[slot].open) continue
        if (activeOn(jobs, slot, now).length >= JOB_QUEUE_CAP) continue
        const startsAt = socketTail(jobs, slot, now)
        const completesAt = new Date(startsAt.getTime() + durationBySocketMinutes[slot] * 60_000)
        if (!best || completesAt < best.completesAt) {
            best = {slot, startsAt, completesAt}
        }
    }
    return best
}

export function workshopAvailability(
    jobs: JobWindow[],
    socketCount: number,
    now: Date
): {open: number; nextOpeningAt: Date | null} {
    let open = 0
    let nextOpeningAt: Date | null = null
    for (let socket = 0; socket < socketCount; socket++) {
        const tail = socketTail(jobs, socket, now)
        if (tail <= now) {
            open++
        } else if (!nextOpeningAt || tail < nextOpeningAt) {
            nextOpeningAt = tail
        }
    }
    return {open, nextOpeningAt: open > 0 ? null : nextOpeningAt}
}

export type JobStatus = 'booked' | 'dropping' | 'queued' | 'crafting' | 'ready' | 'pickingup'

export interface JobStatusInput {
    startsAt: Date
    completesAt: Date
    /** Contract-recorded completion of the input Drop-off. */
    arrivesAt?: Date
    deposited?: boolean
    quantity?: number
    building?: number
    inputs?: readonly CargoItem[]
}

function modulesEqual(a: CargoItem['modules'], b: CargoItem['modules']): boolean {
    const length = Math.max(a?.length ?? 0, b?.length ?? 0)
    for (let i = 0; i < length; i++) {
        const installed = a?.[i]?.installed
        const other = b?.[i]?.installed
        if (Boolean(installed) !== Boolean(other)) return false
        if (
            installed &&
            other &&
            (String(installed.item_id) !== String(other.item_id) ||
                String(installed.stats) !== String(other.stats))
        ) {
            return false
        }
    }
    return true
}

function cargoEquals(a: readonly CargoItem[], b: readonly CargoItem[]): boolean {
    if (a.length !== b.length) return false
    return a.every((x, i) => {
        const y = b[i]
        if (
            String(x.item_id) !== String(y.item_id) ||
            String(x.stats) !== String(y.stats) ||
            String(x.quantity) !== String(y.quantity) ||
            String(x.entity_id ?? 0) !== String(y.entity_id ?? 0) ||
            !modulesEqual(x.modules, y.modules)
        ) {
            return false
        }
        return true
    })
}

function matchesJob(t: OrderedTask, job: JobStatusInput): boolean {
    const subject = t.task.subject
    if (job.building !== undefined && Number(subject?.entity_id) !== job.building) return false
    if (job.inputs !== undefined && !cargoEquals(t.task.cargo, job.inputs)) return false
    return true
}

export function jobDropoffTask(
    job: JobStatusInput,
    tasks: readonly OrderedTask[] | undefined
): OrderedTask | undefined {
    const matches = tasks?.filter(
        (t) =>
            Number(t.task.type) === TaskType.CIVIC_DEPOSIT &&
            matchesJob(t, job) &&
            (job.arrivesAt === undefined || t.completesAt.getTime() === job.arrivesAt.getTime())
    )
    return matches?.length === 1 ? matches[0] : undefined
}

// Without the ship's schedule an undeposited row reads as Dropping off: the transfer usually starts at once.
export function jobStatus(
    job: JobStatusInput,
    now: Date,
    tasks?: readonly OrderedTask[]
): JobStatus {
    if (job.deposited === false) {
        const dropoff = jobDropoffTask(job, tasks)
        return dropoff && now < dropoff.startsAt ? 'booked' : 'dropping'
    }
    if (job.quantity === 0) return 'ready'
    if (now < job.startsAt) return 'queued'
    if (now < job.completesAt) return 'crafting'
    return 'ready'
}

export function jobCancellable(status: JobStatus): boolean {
    return status === 'booked' || status === 'dropping' || status === 'queued'
}

export type JobCancelRoute =
    | {kind: 'dropoff'; shipId: number; laneKey: number; count: number}
    | {kind: 'craft'; jobId: number}
    | {kind: 'build'; jobId: number}

// The ship's cancel pops from the lane tail, so the count reaches from the Drop-off through every task queued behind it.
function cancelRoute(
    job: JobStatusInput & {id: number; shipId?: number},
    queued: 'craft' | 'build',
    now: Date,
    tasks?: readonly OrderedTask[]
): JobCancelRoute | null {
    if (!jobCancellable(jobStatus(job, now, tasks))) return null
    if (job.deposited !== false) return {kind: queued, jobId: job.id}
    if (job.shipId === undefined || !tasks) return null
    const dropoff = jobDropoffTask(job, tasks)
    if (!dropoff || dropoff.completesAt <= now) return null
    const laneLength = tasks.filter((t) => t.laneKey === dropoff.laneKey).length
    return {
        kind: 'dropoff',
        shipId: job.shipId,
        laneKey: dropoff.laneKey,
        count: laneLength - dropoff.taskIndex,
    }
}

export function jobCancelRoute(
    job: JobStatusInput & {id: number; shipId?: number},
    now: Date,
    tasks?: readonly OrderedTask[]
): JobCancelRoute | null {
    return cancelRoute(job, 'craft', now, tasks)
}

// A Build Job's Drop-off rides on the upgrade target itself, so the target plays the ship's part.
export function buildJobCancelRoute(
    job: JobStatusInput & {id: number; targetId?: number},
    now: Date,
    tasks?: readonly OrderedTask[]
): JobCancelRoute | null {
    return cancelRoute({...job, shipId: job.targetId}, 'build', now, tasks)
}

export interface PickupInFlight {
    building: number
    cargo: CargoItem[]
    startsAt: Date
    completesAt: Date
}

export function pickupsInFlight(tasks: OrderedTask[], building?: number): PickupInFlight[] {
    return tasks
        .filter(
            (t) =>
                Number(t.task.type) === TaskType.CIVIC_WITHDRAW &&
                (building === undefined || Number(t.task.subject?.entity_id) === building)
        )
        .map((t) => ({
            building: Number(t.task.subject?.entity_id),
            cargo: [...t.task.cargo],
            startsAt: t.startsAt,
            completesAt: t.completesAt,
        }))
}

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
    booked: 'Booked',
    dropping: 'Dropping off',
    queued: 'Queued',
    crafting: 'Crafting',
    ready: 'Ready for Pickup',
    pickingup: 'Picking up',
}

export function jobStatusLabel(status: JobStatus): string {
    return JOB_STATUS_LABELS[status]
}

// A row written before the deposited flag existed reads as undefined; those jobs were all deposited.
export function jobDeposited(value: unknown): boolean {
    if (value === undefined || value === null) return true
    return Boolean(value)
}

// A deposited row's output is the cargo tail; a cancelled row (quantity 0) holds only its inputs.
export function splitJobCargo<T>(
    cargo: readonly T[],
    deposited: boolean,
    quantity: number
): {output: T | null; inputs: T[]} {
    if (cargo.length === 0) return {output: null, inputs: []}
    if (!deposited || quantity === 0) return {output: null, inputs: [...cargo]}
    return {output: cargo[cargo.length - 1], inputs: cargo.slice(0, -1)}
}

export interface OwnedJob {
    id: number
    building: number
    socket: number
    shipId: number
    coords: {x: number; y: number}
    startsAt: Date
    completesAt: Date
    arrivesAt: Date
    recipeId: number
    quantity: number
    status: JobStatus
    deposited: boolean
    output: CargoItem | null
    inputs: CargoItem[]
    /** Packed stat roll of `output`, so every job shape answers this the same way. */
    outputStats?: bigint
}
