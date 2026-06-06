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
    group?: number
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
        entitygroup: opts.group !== undefined ? UInt64.from(opts.group) : undefined,
    })
}

export interface MakeHaulerOpts {
    id: number
    tasks?: TaskStruct[]
    scheduleStart?: TimePoint
    name?: string
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
        is_idle: tasks.length === 0,
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
        schedule:
            tasks.length === 0
                ? undefined
                : ServerContract.Types.schedule.from({
                      started: opts.scheduleStart ?? SCHEDULE_START,
                      tasks,
                  }),
    })
}

export interface MakePlotOpts {
    id: number
    reserved?: {builderId: number; group?: number; duration: number}
    scheduleStart?: TimePoint
}

export function makePlot(opts: MakePlotOpts): EntityInfoStruct {
    const tasks: TaskStruct[] = []
    if (opts.reserved) {
        tasks.push(
            ServerContract.Types.task.from({
                type: UInt8.from(16),
                duration: UInt32.from(opts.reserved.duration),
                cancelable: UInt8.from(2),
                cargo: [],
                entitytarget: entityRef('ship', opts.reserved.builderId),
                entitygroup:
                    opts.reserved.group !== undefined
                        ? UInt64.from(opts.reserved.group)
                        : undefined,
            })
        )
    }
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
        is_idle: tasks.length === 0,
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
        schedule:
            tasks.length === 0
                ? undefined
                : ServerContract.Types.schedule.from({
                      started: opts.scheduleStart ?? SCHEDULE_START,
                      tasks,
                  }),
    })
}
