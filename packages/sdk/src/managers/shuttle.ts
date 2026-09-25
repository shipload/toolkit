import {
    UInt16,
    UInt32,
    UInt64,
    type UInt16Type,
    type UInt32Type,
    type UInt64Type,
} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {ServerContract} from '../contracts'

export type ShuttleMode = 'internal' | 'own' | 'ship' | 'bays'

export type ShuttleReasonCode =
    | 'workshop-capped'
    | 'no-generator'
    | 'not-equipped'
    | 'job-cap'
    | 'target-busy'
    | 'cargo-wont-fit'
    | 'depot-full'
    | 'not-stored'
    | 'no-storage'
    | 'bays-booked'
    | 'player-cap'
    | 'queue-full'
    | 'inputs-unavailable'
    | 'ship-energy'
    | 'dropoff-collision'
    | 'ship-capped'
    | 'departs'
    | 'cargo-not-aboard'
    | 'no-capacity'
    | 'unknown'

export interface ShuttleReason {
    code: ShuttleReasonCode
    reason: string
    at?: Date
    until?: Date
    have?: number
    need?: number
    cap?: number
    taskType?: number
}

export interface ShuttleOption {
    shuttledBy?: string
    mode: ShuttleMode
    hostId: string
    laneKey: number
    duration: number
    start: Date
    finish: Date
    bays: number
    window?: {startsAt: Date; completesAt: Date}
    energyCost?: number
    blocked?: ShuttleReason
}

export interface ShuttleOptions {
    blocked?: ShuttleReason
    options: ShuttleOption[]
    auto?: ShuttleOption
}

// contract source strings verbatim from errors.hpp and server/placement.hpp (task-11-report.md has the per-entry mapping)
const REASON_CODES: Record<string, ShuttleReasonCode> = {
    'workshop has a pending plan-capper; cannot accept new jobs': 'workshop-capped',
    'ship needs an energy source to book a craft job': 'no-generator',
    'entity cannot recharge': 'no-generator',
    'workshop has no fabricator installed': 'not-equipped',
    'dock has no assembly arm installed': 'not-equipped',
    'too many bookings waiting on materials at this building': 'job-cap',
    'upgrade target is busy': 'target-busy',
    'target cargo would not fit the upgraded capacity': 'cargo-wont-fit',
    'player storage allowance at this depot is exceeded': 'depot-full',
    'player has no such item stored at this depot': 'not-stored',
    'player has fewer of that item stored at this depot': 'not-stored',
    'entity has no storage': 'no-storage',
    'target entity has no storage': 'no-storage',
    "the building's shuttle bays are fully booked": 'bays-booked',
    'player already has the most transfers this building takes': 'player-cap',
    'fabricator queue is full': 'queue-full',
    'Cannot unload cargo that is not loaded.': 'inputs-unavailable',
    'Insufficient inputs for recipe.': 'inputs-unavailable',
    'Cargo debit exceeds available quantity.': 'inputs-unavailable',
    'Craft requires more energy than entity has.': 'ship-energy',
    'identical Workshop delivery already scheduled at this time; finish that delivery or change the shipment':
        'dropoff-collision',
    'cannot append: schedule is capped by a pending plan-capper': 'ship-capped',
    'ship departs before the shuttle completes': 'departs',
    'giver has insufficient giveable cargo': 'cargo-not-aboard',
    'Entity cargo capacity would be exceeded.': 'no-capacity',
}

export const BOOKING_LEVEL_CODES: ReadonlySet<ShuttleReasonCode> = new Set([
    'workshop-capped',
    'no-generator',
    'not-equipped',
    'job-cap',
    'target-busy',
    'cargo-wont-fit',
    'depot-full',
    'not-stored',
    'no-storage',
])

// never-shuttle rejections from resolve_civic_carrier; the query never omits, so the wrapper drops them here
export const OMITTED_REASONS: ReadonlySet<string> = new Set([
    'that ship has no shuttle bay',
    'that ship belongs to another player',
    'that ship is not here',
    "only a Depot's public shuttle bays can take this",
    "choose the building's own shuttle instead",
    'counterpart has a pending plan-capper; cannot place a hold on it',
    'entity not found',
])

export function shuttleReasonCode(reason: string): ShuttleReasonCode {
    return REASON_CODES[reason] ?? 'unknown'
}

const MODES: ShuttleMode[] = ['internal', 'own', 'ship', 'bays']

const modeRank = (o: ShuttleOption) => (o.mode === 'internal' || o.mode === 'own' ? 0 : 1)

export function rankShuttleOptions(a: ShuttleOption, b: ShuttleOption): number {
    const blocked = (o: ShuttleOption) => (o.blocked ? 1 : 0)
    if (blocked(a) !== blocked(b)) return blocked(a) - blocked(b)
    if (a.finish.getTime() !== b.finish.getTime()) return a.finish.getTime() - b.finish.getTime()
    if (modeRank(a) !== modeRank(b)) return modeRank(a) - modeRank(b)
    return Number(BigInt(a.hostId) - BigInt(b.hostId))
}

type RawOptions = ServerContract.Types.shuttle_options

function toDate(tp: {toDate(): Date} | undefined): Date | undefined {
    return tp ? tp.toDate() : undefined
}

function toNum(v: {toNumber(): number} | undefined): number | undefined {
    return v === undefined ? undefined : v.toNumber()
}

function mapReason(r: ServerContract.Types.shuttle_rejection): ShuttleReason {
    return {
        code: shuttleReasonCode(r.reason),
        reason: r.reason,
        at: toDate(r.at),
        until: toDate(r.until),
        have: toNum(r.have),
        need: toNum(r.need),
        cap: toNum(r.cap),
        taskType: toNum(r.task_type),
    }
}

function mapOptions(raw: RawOptions): ShuttleOptions {
    const options: ShuttleOption[] = []
    for (const o of raw.options) {
        const rejection = o.rejection ? mapReason(o.rejection) : undefined
        if (rejection && OMITTED_REASONS.has(rejection.reason)) continue
        const window =
            o.window_starts_at && o.window_completes_at
                ? {
                      startsAt: toDate(o.window_starts_at)!,
                      completesAt: toDate(o.window_completes_at)!,
                  }
                : undefined
        options.push({
            shuttledBy: o.shuttled_by ? o.shuttled_by.toString() : undefined,
            mode: MODES[o.mode.toNumber()] ?? 'internal',
            hostId: o.host_id.toString(),
            laneKey: o.lane_key.toNumber(),
            duration: o.duration.toNumber(),
            start: toDate(o.start)!,
            finish: toDate(o.finish)!,
            bays: o.bays.toNumber(),
            window,
            energyCost: toNum(o.energy_cost),
            blocked: rejection,
        })
    }
    options.sort(rankShuttleOptions)
    const first = options[0]?.blocked
    const blocked =
        first &&
        BOOKING_LEVEL_CODES.has(first.code) &&
        options.every((o) => o.blocked?.reason === first.reason)
            ? first
            : undefined
    const auto = blocked ? undefined : options.find((o) => !o.blocked)
    return {blocked, options, auto}
}

export class ShuttleManager extends BaseManager {
    private async query(
        name:
            | 'getcraftopts'
            | 'getbuildopts'
            | 'getclaimopts'
            | 'getcbldopts'
            | 'getstoreopts'
            | 'gettakeopts',
        data: unknown
    ): Promise<ShuttleOptions> {
        const raw = (await this.server.readonly(name as never, data as never)) as RawOptions
        return mapOptions(ServerContract.Types.shuttle_options.from(raw as RawOptions))
    }

    craft(req: {
        shipId: UInt64Type
        workshopId: UInt64Type
        recipeId: UInt16Type
        quantity: UInt32Type
        inputs: ServerContract.ActionParams.Type.cargo_item[]
        candidates: UInt64Type[]
        recharge?: boolean
    }): Promise<ShuttleOptions> {
        return this.query('getcraftopts', {
            ship_id: UInt64.from(req.shipId),
            workshop_id: UInt64.from(req.workshopId),
            recipe_id: UInt16.from(req.recipeId),
            quantity: UInt32.from(req.quantity),
            inputs: req.inputs,
            candidates: req.candidates.map((c) => UInt64.from(c)),
            recharge: req.recharge ?? false,
        })
    }

    build(req: {
        targetId: UInt64Type
        dockId: UInt64Type
        targetItemId: UInt16Type
        inputs: ServerContract.ActionParams.Type.cargo_item[]
        candidates: UInt64Type[]
    }): Promise<ShuttleOptions> {
        return this.query('getbuildopts', {
            target_id: UInt64.from(req.targetId),
            dock_id: UInt64.from(req.dockId),
            target_item_id: UInt16.from(req.targetItemId),
            inputs: req.inputs,
            candidates: req.candidates.map((c) => UInt64.from(c)),
        })
    }

    claim(req: {
        jobId: UInt64Type
        shipId: UInt64Type
        candidates: UInt64Type[]
    }): Promise<ShuttleOptions> {
        return this.query('getclaimopts', {
            job_id: UInt64.from(req.jobId),
            ship_id: UInt64.from(req.shipId),
            candidates: req.candidates.map((c) => UInt64.from(c)),
        })
    }

    cancelBuild(req: {jobId: UInt64Type; candidates: UInt64Type[]}): Promise<ShuttleOptions> {
        return this.query('getcbldopts', {
            job_id: UInt64.from(req.jobId),
            candidates: req.candidates.map((c) => UInt64.from(c)),
        })
    }

    store(req: {
        shipId: UInt64Type
        depotId: UInt64Type
        items: ServerContract.ActionParams.Type.cargo_item[]
        candidates: UInt64Type[]
    }): Promise<ShuttleOptions> {
        return this.query('getstoreopts', {
            ship_id: UInt64.from(req.shipId),
            depot_id: UInt64.from(req.depotId),
            items: req.items,
            candidates: req.candidates.map((c) => UInt64.from(c)),
        })
    }

    take(req: {
        shipId: UInt64Type
        depotId: UInt64Type
        items: ServerContract.ActionParams.Type.cargo_item[]
        candidates: UInt64Type[]
    }): Promise<ShuttleOptions> {
        return this.query('gettakeopts', {
            ship_id: UInt64.from(req.shipId),
            depot_id: UInt64.from(req.depotId),
            items: req.items,
            candidates: req.candidates.map((c) => UInt64.from(c)),
        })
    }
}
