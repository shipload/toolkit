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
    [TaskType.CIVIC_WITHDRAW, 'all-in'],
    [TaskType.UNLOAD, 'all-out'],
    [TaskType.UPGRADE, 'all-out'],
    [TaskType.CONTRIBUTE, 'all-out'],
    [TaskType.CIVIC_DEPOSIT, 'all-out'],
    [TaskType.GATHER, 'gather'],
    [TaskType.CRAFT, 'craft'],
    [TaskType.UNDEPLOY, 'undeploy'],
])

export function taskCargoRule(taskType: number): TaskCargoRule | undefined {
    return TASK_CARGO_EFFECTS.get(taskType)
}

// Transcribed from TASK_TRAITS in contracts/src/server/include/server/task_traits.hpp.
export type TaskEnergyEffect = 'none' | 'fills' | 'draws' | 'zeroes'

export const TASK_ENERGY_EFFECTS: ReadonlyMap<number, TaskEnergyEffect> = new Map<
    number,
    TaskEnergyEffect
>([
    [TaskType.IDLE, 'none'],
    [TaskType.TRAVEL, 'draws'],
    [TaskType.RECHARGE, 'fills'],
    [TaskType.LOAD, 'none'],
    [TaskType.UNLOAD, 'none'],
    [TaskType.GATHER, 'draws'],
    [TaskType.WARP, 'zeroes'],
    [TaskType.CRAFT, 'draws'],
    [TaskType.TRANSIT, 'none'],
    [TaskType.UNWRAP, 'none'],
    [TaskType.UNDEPLOY, 'none'],
    [TaskType.LAUNCH, 'none'],
    [TaskType.DEMOLISH, 'none'],
    [TaskType.BUILDPLOT, 'draws'],
    [TaskType.CHARGE, 'draws'],
    [TaskType.UPGRADE, 'draws'],
    [TaskType.SHUTTLE, 'none'],
    [TaskType.CONTRIBUTE, 'none'],
    [TaskType.CIVIC_DEPOSIT, 'draws'],
    [TaskType.CIVIC_WITHDRAW, 'none'],
])

export function taskEnergyEffect(taskType: number): TaskEnergyEffect {
    return TASK_ENERGY_EFFECTS.get(taskType) ?? 'none'
}

// Only TRAVEL is both 'draws' and mobility-trait; WARP's 'zeroes' branch never checks this.
export function taskEnergyDrawNeedsCoordinates(taskType: number): boolean {
    return taskType === TaskType.TRAVEL
}
