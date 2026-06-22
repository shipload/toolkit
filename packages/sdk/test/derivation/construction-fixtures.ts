import {Int64, Name, TimePoint, UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../../src/contracts'
import type {TaskType} from '../../src/types'

export const COORDS = ServerContract.Types.coordinates.from({
    x: Int64.from(0),
    y: Int64.from(0),
})
export const OWNER = Name.from('tester.gm')
export const SCHEDULE_START = TimePoint.from('2026-06-02T10:00:00.000')

export type EntityRefStruct = InstanceType<typeof ServerContract.Types.entity_ref>
export type TaskStruct = InstanceType<typeof ServerContract.Types.task>
export type EntityInfoStruct = InstanceType<typeof ServerContract.Types.entity_info>

export function entityRef(type: string, id: number | UInt64): EntityRefStruct {
    return ServerContract.Types.entity_ref.from({
        entity_type: Name.from(type),
        entity_id: typeof id === 'number' ? UInt64.from(id) : id,
    })
}

export interface MakeTaskOpts {
    type: TaskType
    duration: number
    target?: EntityRefStruct
    cargo?: Array<{itemId: number; qty: number}>
}

export function makeTask(opts: MakeTaskOpts): TaskStruct {
    return ServerContract.Types.task.from({
        type: UInt8.from(opts.type),
        duration: UInt32.from(opts.duration),
        cancelable: UInt8.from(2),
        cargo: (opts.cargo ?? []).map((c) =>
            ServerContract.Types.cargo_item.from({
                item_id: UInt16.from(c.itemId),
                quantity: UInt32.from(c.qty),
                stats: UInt64.from(0),
                modules: [],
            })
        ),
        entitytarget: opts.target,
    })
}

export interface MakeHaulerOpts {
    id: number
    tasks?: TaskStruct[]
    scheduleStart?: TimePoint
    name?: string
}

function mobilityLanes(tasks: TaskStruct[], scheduleStart?: TimePoint) {
    if (tasks.length === 0) return []
    return [
        ServerContract.Types.lane.from({
            lane_key: UInt8.from(0),
            schedule: ServerContract.Types.schedule.from({
                started: scheduleStart ?? SCHEDULE_START,
                tasks,
            }),
        }),
    ]
}

export function makeHauler(opts: MakeHaulerOpts): EntityInfoStruct {
    const tasks = opts.tasks ?? []
    return ServerContract.Types.entity_info.from({
        id: UInt64.from(opts.id),
        type: Name.from('ship'),
        item_id: UInt16.from(1000),
        owner: OWNER,
        entity_name: opts.name ?? `Hauler #${opts.id}`,
        cargomass: UInt32.from(0),
        cargo: [],
        coordinates: COORDS,
        modules: [],
        lanes: mobilityLanes(tasks, opts.scheduleStart),
        gatherer_lanes: [],
        crafter_lanes: [],
        loader_lanes: [],
        holds: [],
    })
}

export interface MakePlotOpts {
    id: number
    build?: {builderId: number; completesAt: TimePoint}
}

export function makeBuildHold(opts: {
    id?: number
    builderId: number
    completesAt: TimePoint
}): InstanceType<typeof ServerContract.Types.hold> {
    return ServerContract.Types.hold.from({
        id: UInt64.from(opts.id ?? 1),
        kind: UInt8.from(4),
        counterpart: entityRef('ship', opts.builderId),
        until: opts.completesAt,
        incoming_mass: UInt32.from(0),
    })
}

export function makePlot(opts: MakePlotOpts): EntityInfoStruct {
    const holds = opts.build
        ? [makeBuildHold({builderId: opts.build.builderId, completesAt: opts.build.completesAt})]
        : []
    return ServerContract.Types.entity_info.from({
        id: UInt64.from(opts.id),
        type: Name.from('plot'),
        item_id: UInt16.from(2000),
        owner: OWNER,
        entity_name: `Plot #${opts.id}`,
        cargomass: UInt32.from(0),
        cargo: [],
        coordinates: COORDS,
        modules: [],
        lanes: [],
        gatherer_lanes: [],
        crafter_lanes: [],
        loader_lanes: [],
        holds,
    })
}
