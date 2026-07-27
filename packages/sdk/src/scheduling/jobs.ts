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

export type JobStatus = 'waiting' | 'crafting' | 'ready'

export function jobStatus(job: {startsAt: Date; completesAt: Date}, now: Date): JobStatus {
    if (now < job.startsAt) return 'waiting'
    if (now < job.completesAt) return 'crafting'
    return 'ready'
}

// Generic in the element so raw chain JSON (readonly actions) splits by the same rule as decoded rows.
export function splitJobCargo<T>(cargo: readonly T[]): {output: T | null; inputs: T[]} {
    if (cargo.length === 0) return {output: null, inputs: []}
    return {output: cargo[cargo.length - 1], inputs: cargo.slice(0, -1)}
}

export interface OwnedJob {
    id: number
    workshop: number
    socket: number
    shipId: number
    coords: {x: number; y: number}
    startsAt: Date
    completesAt: Date
    recipeId: number
    quantity: number
    status: JobStatus
    output: CargoItem | null
    inputs: CargoItem[]
    /** Packed stat roll of `output`, so every job shape answers this the same way. */
    outputStats?: bigint
}
