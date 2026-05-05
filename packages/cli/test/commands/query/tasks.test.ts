import {expect, test} from 'bun:test'
import {render} from '../../../src/commands/query/tasks'

const idleShip = {
    type: 'ship',
    id: 1n,
    owner: 'agent.gm',
    entity_name: 'Test Ship',
    coordinates: {x: 0n, y: 0n},
    is_idle: true,
    current_task: null,
    current_task_remaining: 0,
    pending_tasks: [],
}

test('tasks renders schedule with per-task timing', () => {
    const now = new Date('2026-04-21T14:32:10Z')
    const started = new Date('2026-04-21T14:12:00Z')
    const out = render({
        entity: idleShip,
        schedule: {
            started,
            tasks: [
                {type: 1, duration: 222, cancelable: 0},
                {type: 5, duration: 1968, cancelable: 0},
            ],
        },
        pending: [],
        additions: [[], []],
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
        entity: idleShip,
        schedule: null,
        pending: [],
        additions: [],
        now: new Date(),
    } as any)
    expect(out).toContain('ship 1')
    expect(out.toLowerCase()).toContain('no scheduled tasks')
})

test('busy entity past wall-clock schedule end keeps active task active', () => {
    const busyShip = {
        type: 'ship',
        id: 1n,
        owner: 'agent.gm',
        entity_name: 'Starter',
        coordinates: {x: 0n, y: 0n},
        is_idle: false,
        current_task: {type: 7, duration: 3120, cancelable: 0},
        current_task_remaining: 8,
        pending_tasks: [],
    }
    const started = new Date('2026-04-21T07:01:17Z')
    const out = render({
        entity: busyShip,
        schedule: {
            started,
            tasks: [
                {type: 2, duration: 51, cancelable: 0},
                {type: 7, duration: 3120, cancelable: 0},
            ],
        },
        pending: [],
        additions: [[], []],
        now: new Date('2026-04-21T08:00:00Z'),
    } as any)
    expect(out).toMatch(/Recharge[^\n]*done/)
    expect(out).toMatch(/Craft[^\n]*active/)
})
