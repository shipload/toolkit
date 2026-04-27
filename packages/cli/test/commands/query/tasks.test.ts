import {expect, test} from 'bun:test'
import {render} from '../../../src/commands/query/tasks'

test('tasks renders schedule with per-task timing', () => {
    const now = new Date('2026-04-21T14:32:10Z')
    const started = new Date('2026-04-21T14:12:00Z')
    const out = render({
        type: 'ship',
        id: 1n,
        schedule: {
            started,
            tasks: [
                {type: 1, duration: 222, cancelable: 0},
                {type: 5, duration: 1968, cancelable: 0},
            ],
        },
        pending: [],
        now,
    } as any)
    expect(out).toContain('ship 1')
    expect(out).toContain('Travel')
    expect(out).toContain('Gather')
    expect(out).toContain('3m 42s')
    expect(out).toContain('32m 48s')
    expect(out).toMatch(/ago|left/)
})

test('tasks renders idle when no schedule', () => {
    const out = render({
        type: 'ship',
        id: 1n,
        schedule: null,
        pending: [],
        now: new Date(),
    } as any)
    expect(out).toContain('ship 1')
    expect(out.toLowerCase()).toContain('no scheduled tasks')
})
