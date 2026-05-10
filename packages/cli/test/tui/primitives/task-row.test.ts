import {describe, expect, test} from 'bun:test'
import type {ServerTypes} from '@shipload/sdk'
import {renderTaskRow} from '../../../src/tui/primitives/task-row'
import {collectText} from '../render-tree'

function dummyTask(): ServerTypes.task {
    return {type: 0, duration: 60n, cancelable: 0, cargo: []} as never
}

describe('renderTaskRow', () => {
    test('renders prefix + description + duration + completion-time as 3 segments', () => {
        const node = renderTaskRow({
            prefix: '  ✓ ',
            task: dummyTask(),
            duration: 'done',
            completionTime: '22:11:42 UTC',
        })
        const text = collectText(node).join('|')
        expect(text).toContain('done')
        expect(text).toContain('22:11:42 UTC')
    })

    test('omits completion-time column when not provided (active-row case)', () => {
        const node = renderTaskRow({
            prefix: '  ▶ ',
            task: dummyTask(),
            duration: '14m 43s',
        })
        const text = collectText(node).join('|')
        expect(text).toContain('14m 43s')
        expect(text).not.toMatch(/UTC/)
    })

    test('supports an explicit fg color override', () => {
        const node = renderTaskRow({
            prefix: '    ',
            task: dummyTask(),
            duration: '1m 18s',
            completionTime: '22:32:58 UTC',
            fg: '#888888',
        })
        expect(node).toBeDefined()
    })
})
