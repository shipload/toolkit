import {describe, expect, test} from 'bun:test'
import {CancelBlockReason, ServerContract, TaskCancelable, TaskType} from '@shipload/sdk'
import {CancelWorld, type CancelWorldSource, cancelRefusalLine} from '../../src/lib/cancel-preview'

const T0 = '2026-06-19T00:00:00'
const NOW = new Date('2026-06-19T00:00:10.000Z')

function task(over: {type?: number; cancelable?: number; group?: number; duration?: number}) {
    return ServerContract.Types.task.from({
        type: over.type ?? TaskType.TRAVEL,
        duration: over.duration ?? 100,
        cancelable: over.cancelable ?? TaskCancelable.BEFORE_START,
        cargo: [],
        couplings: [],
        ...(over.group !== undefined ? {entitygroup: over.group} : {}),
    })
}

function entity(id: number, tasks: ReturnType<typeof task>[]) {
    return ServerContract.Types.entity_info.from({
        projected_at: 0,
        type: 'ship',
        id,
        owner: 'player.gm',
        entity_name: `Ship ${id}`,
        coordinates: {x: 0, y: 0, z: 0},
        item_id: 1,
        cargomass: 0,
        cargo: [],
        modules: [],
        lanes: [{lane_key: 0, schedule: {started: T0, tasks}}],
        gatherer_lanes: [],
        crafter_lanes: [],
        builder_lanes: [],
        loader_lanes: [],
        holds: [],
    })
}

function source(over: Partial<CancelWorldSource> = {}): CancelWorldSource & {fetched: string[]} {
    const fetched: string[] = []
    return {
        fetched,
        entity: async (id) => {
            fetched.push(`entity:${id}`)
            return entity(Number(id), [task({}), task({group: 7})])
        },
        groupParticipants: async (id) => {
            fetched.push(`group:${id}`)
            return ['1', '2']
        },
        cluster: async () => ({root: 0, cells: []}),
        hubAt: async () => undefined,
        ...over,
    }
}

describe('CancelWorld', () => {
    test('--all takes the longest tail range the contract accepts', async () => {
        const ship = entity(1, [
            task({}),
            task({cancelable: TaskCancelable.NEVER, type: TaskType.GATHER}),
            task({cancelable: TaskCancelable.ALWAYS}),
            task({cancelable: TaskCancelable.ALWAYS}),
        ])
        const {fromTaskIndex, plan} = await new CancelWorld(source(), NOW).resolve(ship, 0, {
            kind: 'all',
        })
        expect(fromTaskIndex).toBe(2)
        expect(plan.ok).toBe(true)
        expect(plan.range.count).toBe(2)
    })

    test('--from reports the refusal the contract would give', async () => {
        const ship = entity(1, [task({}), task({cancelable: TaskCancelable.NEVER, type: TaskType.GATHER})])
        const {plan} = await new CancelWorld(source(), NOW).resolve(ship, 0, {kind: 'from', index: 1})
        expect(plan.blockedReason).toBe(CancelBlockReason.TASK_NEVER)
        expect(cancelRefusalLine(plan)).toBe('Cannot cancel: task is non-cancelable.')
    })

    test('a grouped tail fetches the group and its participants before deciding', async () => {
        const src = source()
        const ship = entity(1, [task({}), task({group: 7})])
        const {plan} = await new CancelWorld(src, NOW).resolve(ship, 0, {kind: 'from', index: 1})
        expect(src.fetched).toEqual(['group:7', 'entity:2'])
        expect(plan.ok).toBe(true)
        expect(plan.cascade).toEqual(['2'])
    })

    test('a grouped task inside a longer range is refused with the grouped-range message', async () => {
        const ship = entity(1, [task({}), task({group: 7}), task({})])
        const {plan} = await new CancelWorld(source(), NOW).resolve(ship, 0, {kind: 'from', index: 0})
        expect(plan.blockedReason).toBe(CancelBlockReason.GROUP_IN_RANGE)
        expect(cancelRefusalLine(plan)).toContain('cancel it on its own with a count of 1')
    })
})
