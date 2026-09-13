import {describe, expect, test} from 'bun:test'
import {TaskType} from '../types'
import {taskCargoRule} from './task-effects'

describe('taskCargoRule', () => {
    test('maps the task types that move cargo out of the entity', () => {
        expect(taskCargoRule(TaskType.UNLOAD)).toBe('all-out')
        expect(taskCargoRule(TaskType.UPGRADE)).toBe('all-out')
        expect(taskCargoRule(TaskType.CONTRIBUTE)).toBe('all-out')
        expect(taskCargoRule(TaskType.CIVIC_DEPOSIT)).toBe('all-out')
    })

    test('maps the task types that move cargo into the entity', () => {
        expect(taskCargoRule(TaskType.LOAD)).toBe('all-in')
        expect(taskCargoRule(TaskType.UNWRAP)).toBe('all-in')
        expect(taskCargoRule(TaskType.CIVIC_WITHDRAW)).toBe('all-in')
    })

    test('maps the conditional task types to their own rules', () => {
        expect(taskCargoRule(TaskType.GATHER)).toBe('gather')
        expect(taskCargoRule(TaskType.CRAFT)).toBe('craft')
        expect(taskCargoRule(TaskType.UNDEPLOY)).toBe('undeploy')
    })

    test('maps the task types that move no cargo', () => {
        expect(taskCargoRule(TaskType.TRAVEL)).toBe('none')
        expect(taskCargoRule(TaskType.RECHARGE)).toBe('none')
        expect(taskCargoRule(TaskType.DEMOLISH)).toBe('none')
        expect(taskCargoRule(TaskType.BUILDPLOT)).toBe('none')
    })

    test('returns undefined for a task type the table does not know', () => {
        expect(taskCargoRule(99)).toBeUndefined()
    })
})
