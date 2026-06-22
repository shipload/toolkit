import {expect, test} from 'bun:test'
import {schedule, ServerContract} from '@shipload/sdk'
import {buildTasksView, render, viewToJson} from '../../../src/commands/query/tasks'
import {formatOutput} from '../../../src/lib/format'

function makeShip(opts: {
    id?: number
    owner?: string
    name?: string
    is_idle?: boolean
    pending_tasks?: Array<{
        type: number
        duration: number
        cancelable: number
        coordinates?: {x: number; y: number; z: number}
        cargo?: unknown[]
    }>
    lanes?: Array<{
        lane_key: number
        schedule: {
            started: string
            tasks: Array<{
                type: number
                duration: number
                cancelable: number
                coordinates?: {x: number; y: number; z: number}
                cargo?: unknown[]
            }>
        }
    }>
}) {
    const entity = ServerContract.Types.entity_info.from({
        type: 'ship',
        id: opts.id ?? 1,
        owner: opts.owner ?? 'agent.gm',
        entity_name: opts.name ?? 'Test Ship',
        coordinates: {x: 0, y: 0, z: 800},
        item_id: 0,
        cargomass: 0,
        cargo: [],
        modules: [],
        gatherer_lanes: [],
        crafter_lanes: [],
        loader_lanes: [],
        lanes: opts.lanes ?? [],
        holds: [],
    })
    return entity
}

test('tasks renders schedule with per-task timing', () => {
    const now = new Date('2026-04-21T14:32:10Z')
    const started = new Date('2026-04-21T14:12:00Z').toISOString().slice(0, 23)
    const ei = makeShip({
        is_idle: false,
        lanes: [
            {
                lane_key: 0,
                schedule: {
                    started,
                    tasks: [
                        {type: 1, duration: 222, cancelable: 0, cargo: []},
                        {type: 5, duration: 1968, cancelable: 0, cargo: []},
                    ],
                },
            },
        ],
    })
    const out = render(buildTasksView(ei, now))
    expect(out).toContain('ship 1')
    expect(out).toContain('Travel')
    expect(out).toContain('Gather')
    expect(out).toContain('3m 42s')
    expect(out).toContain('32m 48s')
    expect(out).toMatch(/ago|left/)
})

test('tasks renders idle when no schedule', () => {
    const ei = makeShip({is_idle: true})
    const out = render(buildTasksView(ei, new Date()))
    expect(out).toContain('ship 1')
    expect(out.toLowerCase()).toContain('no scheduled tasks')
})

test('entity with schedule completed by wall-clock shows all done', () => {
    const started = new Date('2026-04-21T07:01:17Z').toISOString().slice(0, 23)
    const ei = makeShip({
        id: 1,
        name: 'Starter',
        is_idle: false,
        lanes: [
            {
                lane_key: 0,
                schedule: {
                    started,
                    tasks: [
                        {type: 2, duration: 51, cancelable: 0, cargo: []},
                        {type: 7, duration: 3120, cancelable: 0, cargo: []},
                    ],
                },
            },
        ],
    })
    const out = render(buildTasksView(ei, new Date('2026-04-21T08:00:00Z')))
    expect(out).toMatch(/Recharge[^\n]*done/)
    expect(out).toMatch(/Craft[^\n]*done/)
})

function multiLaneInfoArgs(at: Date) {
    const startedMobility = new Date(at.getTime() - 120_000).toISOString().slice(0, 23)
    const startedWorker = new Date(at.getTime() - 60_000).toISOString().slice(0, 23)
    return {
        type: 'ship',
        id: 42,
        owner: 'alice',
        entity_name: 'Multi',
        coordinates: {x: 0, y: 0, z: 800},
        item_id: 0,
        cargomass: 0,
        cargo: [],
        modules: [],
        is_idle: false,
        current_task_elapsed: 0,
        current_task_remaining: 0,
        pending_tasks: [],
        gatherer_lanes: [],
        crafter_lanes: [],
        loader_lanes: [],
        lanes: [
            {
                lane_key: 0,
                schedule: {
                    started: startedMobility,
                    tasks: [
                        {
                            type: 1,
                            duration: 60,
                            cancelable: 0,
                            coordinates: {x: 3, y: 9, z: 800},
                            cargo: [],
                        },
                    ],
                },
            },
            {
                lane_key: 3,
                schedule: {
                    started: startedWorker,
                    tasks: [
                        {type: 6, duration: 300, cancelable: 0, cargo: []},
                        {type: 7, duration: 540, cancelable: 2, cargo: []},
                    ],
                },
            },
        ],
        holds: [],
    }
}

test('renders all lanes as semantic sections in lane-native order', () => {
    const at = new Date('2026-06-11T12:00:00.000Z')
    const startedMobility = new Date(at.getTime() - 120_000).toISOString().slice(0, 23)
    const startedWorker = new Date(at.getTime() - 60_000).toISOString().slice(0, 23)
    const startedWaiting = new Date(at.getTime() + 30_000).toISOString().slice(0, 23)
    const startedBarrier = new Date(at.getTime() - 30_000).toISOString().slice(0, 23)
    const ei = makeShip({
        is_idle: false,
        lanes: [
            {
                lane_key: schedule.LANE_BARRIER,
                schedule: {
                    started: startedBarrier,
                    tasks: [{type: 1, duration: 60, cancelable: 0, cargo: []}],
                },
            },
            {
                lane_key: 3,
                schedule: {
                    started: startedWorker,
                    tasks: [
                        {type: 6, duration: 300, cancelable: 0, cargo: []},
                        {type: 7, duration: 540, cancelable: 2, cargo: []},
                    ],
                },
            },
            {
                lane_key: 1,
                schedule: {
                    started: startedWaiting,
                    tasks: [{type: 5, duration: 60, cancelable: 0, cargo: []}],
                },
            },
            {
                lane_key: 0,
                schedule: {
                    started: startedMobility,
                    tasks: [
                        {
                            type: 1,
                            duration: 60,
                            cancelable: 0,
                            coordinates: {x: 3, y: 9, z: 800},
                            cargo: [],
                        },
                    ],
                },
            },
        ],
    })
    const view = buildTasksView(ei, at)
    const out = render(view)
    expect(out.indexOf('mobility ·')).toBeLessThan(out.indexOf('L1 worker ·'))
    expect(out.indexOf('L1 worker ·')).toBeLessThan(out.indexOf('L3 worker ·'))
    expect(out.indexOf('L3 worker ·')).toBeLessThan(out.indexOf('barrier ·'))
    expect(out).toContain('L3 worker')
    expect(out).not.toContain('3:worker')
    expect(out).toMatch(/Warp\s+active/)
    expect(out).toMatch(/Craft\s+pending/)
    expect(out).toMatch(/Travel\s+done/)
})

test('barrier lane renders as barrier instead of a worker lane', () => {
    const at = new Date('2026-06-11T12:00:00.000Z')
    const startedBarrier = new Date(at.getTime() - 30_000).toISOString().slice(0, 23)
    const ei = makeShip({
        is_idle: false,
        lanes: [
            {
                lane_key: schedule.LANE_BARRIER,
                schedule: {
                    started: startedBarrier,
                    tasks: [{type: 1, duration: 60, cancelable: 0, cargo: []}],
                },
            },
        ],
    })

    const out = render(buildTasksView(ei, at))
    expect(out).toContain('barrier · active')
    expect(out).not.toContain('L255 worker')
    expect(out).not.toContain('255:worker')
})

test('active lane with a completed front surfaces ready to resolve at section level', () => {
    const at = new Date('2026-06-11T12:00:00.000Z')
    const startedWorker = new Date(at.getTime() - 90_000).toISOString().slice(0, 23)
    const ei = makeShip({
        is_idle: false,
        lanes: [
            {
                lane_key: 3,
                schedule: {
                    started: startedWorker,
                    tasks: [
                        {type: 6, duration: 60, cancelable: 0, cargo: []},
                        {type: 7, duration: 120, cancelable: 2, cargo: []},
                    ],
                },
            },
        ],
    })

    const out = render(buildTasksView(ei, at))
    expect(out).toContain('L3 worker · ready to resolve')
    expect(out).toMatch(/Warp\s+done/)
    expect(out).toMatch(/Craft\s+active/)
    expect(out).not.toMatch(/Craft\s+ready to resolve/)
})

test('json carries both schedule (mobility) and lanes', () => {
    const at = new Date('2026-06-11T12:00:00.000Z')
    const ei = ServerContract.Types.entity_info.from(multiLaneInfoArgs(at))
    const json = viewToJson(buildTasksView(ei, at))
    expect(json.schedule).not.toBeNull()
    expect(Array.isArray(json.lanes)).toBe(true)
    expect((json.lanes as unknown[]).length).toBe(2)
})

test('json carries flat rows and semantic task sections', () => {
    const at = new Date('2026-06-11T12:00:00.000Z')
    const ei = ServerContract.Types.entity_info.from(multiLaneInfoArgs(at))
    const json = viewToJson(buildTasksView(ei, at))
    const rows = json.rows as Array<Record<string, unknown>>
    const sections = json.sections as Array<Record<string, unknown>>

    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.lane_key)).toEqual([0, 3, 3])
    expect(sections).toHaveLength(2)
    expect(sections[0]).toMatchObject({
        lane_key: 0,
        lane_label: 'mobility',
        status: 'ready to resolve',
    })
    expect(sections[0]?.front).toMatchObject({status: 'ready to resolve'})
    expect(sections[0]?.rows).toHaveLength(1)
    expect(sections[1]).toMatchObject({
        lane_key: 3,
        lane_label: 'L3 worker',
        status: 'active',
    })
    expect(sections[1]?.front).toMatchObject({status: 'active', active_index: 0})
    expect(sections[1]?.rows).toHaveLength(2)
})

test('json formatter derives pending from lanes and exposes lane-native fields', () => {
    const at = new Date('2026-06-11T12:00:00.000Z')
    const mobilityStartedAt = new Date(at.getTime() - 120_000)
    const workerStarted = new Date(at.getTime() - 60_000).toISOString().slice(0, 23)
    const ei = makeShip({
        is_idle: false,
        lanes: [
            {
                lane_key: 0,
                schedule: {
                    started: mobilityStartedAt.toISOString().slice(0, 23),
                    tasks: [
                        {
                            type: 5,
                            duration: 60,
                            cancelable: 0,
                            cargo: [{item_id: 1, quantity: 2, stats: 123, modules: []}],
                        },
                    ],
                },
            },
            {
                lane_key: 3,
                schedule: {
                    started: workerStarted,
                    tasks: [
                        {type: 7, duration: 540, cancelable: 2, cargo: []},
                        {type: 2, duration: 30, cancelable: 0, cargo: []},
                    ],
                },
            },
        ],
    })

    const formatted = formatOutput(viewToJson(buildTasksView(ei, at)), {json: true}, () => '')
    const parsed = JSON.parse(formatted)

    expect(parsed.schedule.started).toBe(mobilityStartedAt.toISOString())
    // Worker lane's first task is in progress, its second is queued → one pending.
    expect(parsed.pending).toHaveLength(1)
    expect(parsed.cargo_changes).toHaveLength(1)
    expect(parsed.cargo_changes[0]).toHaveLength(1)
    expect(parsed.cargo_changes[0][0]).toMatchObject({
        direction: 'in',
        item_id: 1,
        quantity: 2,
        stack_id: '123',
    })
    expect(typeof parsed.cargo_changes[0][0].item_name).toBe('string')
    expect(parsed.rows).toHaveLength(3)
    expect(parsed.lanes).toHaveLength(2)
    expect(parsed.lanes[0].started).toBe(mobilityStartedAt.toISOString())
    expect(parsed.sections).toHaveLength(2)
    expect(parsed.sections[1]).toMatchObject({lane_key: 3, lane_label: 'L3 worker'})
})
