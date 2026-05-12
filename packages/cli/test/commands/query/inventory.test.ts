import {describe, expect, test} from 'bun:test'
import {ServerContract, TaskType} from '@shipload/sdk'
import {
    buildInventoryData,
    render,
    SUBCOMMAND,
    SUBCOMMAND_CARGO_ALIAS,
} from '../../../src/commands/query/inventory'

function makeEntity(opts: {
    cargo?: {item_id: number; quantity: number; stats: number | bigint; id?: number}[]
    current_task?: ServerContract.Types.task
    pending_tasks?: ServerContract.Types.task[]
}) {
    return ServerContract.Types.entity_info.from({
        type: 'ship',
        id: 1,
        owner: 'alice',
        entity_name: 'Test',
        coordinates: {x: 0, y: 0, z: 800},
        cargomass: 0,
        cargo: (opts.cargo ?? []).map((c) => ({
            item_id: c.item_id,
            quantity: c.quantity,
            stats: c.stats,
            modules: [],
            id: c.id ?? 0,
        })),
        modules: [],
        is_idle: !opts.current_task,
        current_task: opts.current_task,
        current_task_elapsed: 0,
        current_task_remaining: 0,
        pending_tasks: opts.pending_tasks ?? [],
    })
}

function invTask(
    type: TaskType,
    items: {item_id: number; quantity: number; stats: number | bigint}[]
) {
    return ServerContract.Types.task.from({
        type,
        duration: 60,
        cancelable: 0,
        cargo: items.map((i) => ({
            item_id: i.item_id,
            quantity: i.quantity,
            stats: i.stats,
            modules: [],
        })),
    })
}

describe('inventory.render', () => {
    test('empty cargo prints empty marker', () => {
        const out = render(makeEntity({cargo: []}))
        expect(out).toContain('ship 1')
        expect(out.toLowerCase()).toContain('empty')
    })

    test('idle entity with non-empty cargo includes cargo columns', () => {
        const out = render(
            makeEntity({
                cargo: [
                    {item_id: 301, quantity: 32, stats: 214202522n, id: 7},
                    {item_id: 201, quantity: 5, stats: 999n, id: 11},
                ],
            })
        )
        expect(out).toContain('Row ID')
        expect(out).toContain('Item ID')
        expect(out).toContain('Stack ID')
        expect(out).toContain('Qty')
        expect(out).toContain('301')
        expect(out).toContain('201')
        expect(out).toContain('7')
        expect(out).toContain('11')
    })

    test('busy entity with queued WRAP -1u shows (-1) delta and identity line', () => {
        const out = render(
            makeEntity({
                cargo: [{item_id: 301, quantity: 5, stats: 0n, id: 1}],
                pending_tasks: [invTask(TaskType.WRAP, [{item_id: 301, quantity: 1, stats: 0n}])],
            })
        )
        expect(out).toContain('ship 1')
        expect(out).toContain('(-1)')
    })

    test('--current flag suppresses delta annotations', () => {
        const out = render(
            makeEntity({
                cargo: [{item_id: 301, quantity: 5, stats: 0n, id: 1}],
                pending_tasks: [invTask(TaskType.WRAP, [{item_id: 301, quantity: 1, stats: 0n}])],
            }),
            {current: true}
        )
        expect(out).not.toContain('(-1)')
        expect(out).not.toContain('(new)')
        expect(out).toContain('5')
    })
})

describe('inventory.buildInventoryData', () => {
    test('idle entity: projection.applies=false, tasks_considered=0', () => {
        const entity = makeEntity({
            cargo: [{item_id: 301, quantity: 5, stats: 0n, id: 1}],
        })
        const data = buildInventoryData(entity)
        expect(data.projection.applies).toBe(false)
        expect(data.projection.tasks_considered).toBe(0)
        expect(data.cargo.length).toBe(1)
        expect(data.projected_cargo.length).toBe(1)
        expect(data.projected_cargo[0].quantity).toBe(5n)
        expect(data.projected_cargo[0].item_id).toBe(301n)
    })

    test('queued WRAP -1u: projection.applies=true, projected_cargo reflects -1 qty', () => {
        const entity = makeEntity({
            cargo: [{item_id: 301, quantity: 5, stats: 0n, id: 1}],
            pending_tasks: [invTask(TaskType.WRAP, [{item_id: 301, quantity: 1, stats: 0n}])],
        })
        const data = buildInventoryData(entity)
        expect(data.projection.applies).toBe(true)
        expect(data.projection.tasks_considered).toBe(1)
        const stack = data.projected_cargo.find((s) => s.item_id === 301n)
        expect(stack).toBeDefined()
        expect(stack!.quantity).toBe(4n)
        expect(data.cargo[0].quantity.toString()).toBe('5')
    })

    test('busy entity: tasks_considered = current_task (1) + pending.length', () => {
        const entity = makeEntity({
            cargo: [{item_id: 301, quantity: 10, stats: 0n, id: 1}],
            current_task: invTask(TaskType.WRAP, [{item_id: 301, quantity: 1, stats: 0n}]),
            pending_tasks: [
                invTask(TaskType.WRAP, [{item_id: 301, quantity: 1, stats: 0n}]),
                invTask(TaskType.WRAP, [{item_id: 301, quantity: 1, stats: 0n}]),
            ],
        })
        const data = buildInventoryData(entity)
        expect(data.projection.tasks_considered).toBe(3)
        expect(data.projection.applies).toBe(true)
    })

    test('--current flag: projection.applies=false, tasks_considered=0, projected_cargo matches cargo', () => {
        const entity = makeEntity({
            cargo: [{item_id: 301, quantity: 5, stats: 0n, id: 1}],
            pending_tasks: [invTask(TaskType.WRAP, [{item_id: 301, quantity: 1, stats: 0n}])],
        })
        const data = buildInventoryData(entity, {current: true})
        expect(data.projection.applies).toBe(false)
        expect(data.projection.tasks_considered).toBe(0)
        expect(data.projected_cargo.length).toBe(1)
        expect(data.projected_cargo[0].quantity).toBe(5n)
    })
})

describe('cargo alias', () => {
    test("alias subcommand exists with name 'cargo'", () => {
        expect(SUBCOMMAND_CARGO_ALIAS.name).toBe('cargo')
    })
    test('alias appliesTo same set as inventory', () => {
        expect(SUBCOMMAND_CARGO_ALIAS.appliesTo).toEqual(SUBCOMMAND.appliesTo)
    })
    test('inventory subcommand registers --current flag', () => {
        const cmd = SUBCOMMAND.build({entityType: 'ship', entityId: 1n} as never)
        const opt = cmd.options.find((o) => o.long === '--current')
        expect(opt).toBeDefined()
    })
    test('cargo alias subcommand registers --current flag', () => {
        const cmd = SUBCOMMAND_CARGO_ALIAS.build({entityType: 'ship', entityId: 1n} as never)
        const opt = cmd.options.find((o) => o.long === '--current')
        expect(opt).toBeDefined()
    })
})
