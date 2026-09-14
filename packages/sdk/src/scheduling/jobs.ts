import type {ServerContract} from '../contracts'

type CargoItem = ServerContract.Types.cargo_item

export interface JobWindow {
    id: number
    socket: number
    owner: string
    startsAt: Date
    completesAt: Date
    recipeId: number
    quantity: number
    /** False while the job is In Line: booked, with its inputs still in transit to the building. */
    deposited: boolean
    /** Packed stat roll of the job's output, when the source carried the job's cargo. */
    outputStats?: bigint
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

export type JobStatus = 'inline' | 'waiting' | 'crafting' | 'ready'

// A job In Line has no window yet, so the window alone would read it as long since ready.
export function jobStatus(
    job: {startsAt: Date; completesAt: Date; deposited?: boolean},
    now: Date
): JobStatus {
    if (job.deposited === false) return 'inline'
    if (now < job.startsAt) return 'waiting'
    if (now < job.completesAt) return 'crafting'
    return 'ready'
}

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
    inline: 'In Line',
    waiting: 'Waiting',
    crafting: 'Crafting',
    ready: 'Ready for Pickup',
}

export function jobStatusLabel(status: JobStatus): string {
    return JOB_STATUS_LABELS[status]
}

// A row written before the deposited flag existed reads as undefined; those jobs were all deposited.
export function jobDeposited(value: unknown): boolean {
    if (value === undefined || value === null) return true
    return Boolean(value)
}

// A job row holds the inputs while In Line and the output once its drop-off has landed.
export function splitJobCargo<T>(
    cargo: readonly T[],
    deposited: boolean
): {output: T | null; inputs: T[]} {
    if (cargo.length === 0) return {output: null, inputs: []}
    if (!deposited) return {output: null, inputs: [...cargo]}
    return {output: cargo[0], inputs: []}
}

export interface OwnedJob {
    id: number
    building: number
    socket: number
    shipId: number
    coords: {x: number; y: number}
    startsAt: Date
    completesAt: Date
    recipeId: number
    quantity: number
    status: JobStatus
    deposited: boolean
    output: CargoItem | null
    inputs: CargoItem[]
    /** Packed stat roll of `output`, so every job shape answers this the same way. */
    outputStats?: bigint
}
