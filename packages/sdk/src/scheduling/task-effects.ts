import {TaskType} from '../types'

export type TaskCargoRule = 'none' | 'all-in' | 'all-out' | 'gather' | 'craft' | 'undeploy'

// Transcribed from the switch in contracts/src/server/src/projection.cpp.
export const TASK_CARGO_EFFECTS: ReadonlyMap<number, TaskCargoRule> = new Map<
    number,
    TaskCargoRule
>([
    [TaskType.IDLE, 'none'],
    [TaskType.TRAVEL, 'none'],
    [TaskType.RECHARGE, 'none'],
    [TaskType.WARP, 'none'],
    [TaskType.TRANSIT, 'none'],
    [TaskType.LAUNCH, 'none'],
    [TaskType.DEMOLISH, 'none'],
    [TaskType.BUILDPLOT, 'none'],
    [TaskType.CHARGE, 'none'],
    [TaskType.SHUTTLE, 'none'],
    [TaskType.LOAD, 'all-in'],
    [TaskType.UNWRAP, 'all-in'],
    [TaskType.DEPOT_TAKE, 'all-in'],
    [TaskType.UNLOAD, 'all-out'],
    [TaskType.UPGRADE, 'all-out'],
    [TaskType.CONTRIBUTE, 'all-out'],
    [TaskType.DEPOT_STORE, 'all-out'],
    [TaskType.GATHER, 'gather'],
    [TaskType.CRAFT, 'craft'],
    [TaskType.UNDEPLOY, 'undeploy'],
])

export function taskCargoRule(taskType: number): TaskCargoRule | undefined {
    return TASK_CARGO_EFFECTS.get(taskType)
}
