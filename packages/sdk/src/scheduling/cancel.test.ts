import {describe, expect, test} from 'bun:test'
import {ServerContract, TaskType, TaskCancelable, HoldKind} from '../index-module'
import {
    cancelEligibility,
    CancelBlockReason,
    CANCEL_REFUSAL_REASONS,
    cancelRefusalMessage,
} from './cancel'
import {CANCEL_REFUSALS} from '../errors'

const T0 = '2026-06-19T00:00:00'

function task(
    over: Partial<{
        type: number
        duration: number
        cancelable: number
        group: number
    }>
) {
    return ServerContract.Types.task.from({
        type: over.type ?? TaskType.TRAVEL,
        duration: over.duration ?? 100,
        cancelable: over.cancelable ?? TaskCancelable.BEFORE_START,
        cargo: [],
        couplings: [],
        ...(over.group !== undefined ? {entitygroup: over.group} : {}),
    })
}

function entity(tasks: ReturnType<typeof task>[], startedISO = T0) {
    return ServerContract.Types.entity_info.from({
        projected_at: 0,
        type: 'ship',
        id: 1,
        owner: 'player.gm',
        entity_name: 'Ship 1',
        coordinates: {x: 0, y: 0, z: 0},
        item_id: 1,
        cargomass: 0,
        cargo: [],
        modules: [],
        lanes: [{lane_key: 0, schedule: {started: startedISO, tasks}}],
        gatherer_lanes: [],
        crafter_lanes: [],
        builder_lanes: [],
        loader_lanes: [],
        holds: [],
    })
}

describe('cancelEligibility — local gates', () => {
    const now = new Date('2026-06-19T00:00:10.000Z') // 10s in: task 0 running, task 1 upcoming

    test('cancelling the last upcoming task: ok, count 1', () => {
        const e = entity([task({}), task({})])
        const plan = cancelEligibility(e, 0, 1, {now})
        expect(plan.ok).toBe(true)
        expect(plan.range.count).toBe(1)
        expect(plan.range.taskIndices).toEqual([1])
    })

    test('NEVER task is blocked', () => {
        const e = entity([
            task({}),
            task({cancelable: TaskCancelable.NEVER, type: TaskType.GATHER}),
        ])
        expect(cancelEligibility(e, 0, 1, {now}).blockedReason).toBe(CancelBlockReason.TASK_NEVER)
    })

    test('BEFORE_START task that is running is blocked', () => {
        const e = entity([task({cancelable: TaskCancelable.BEFORE_START, duration: 100})])
        // task 0 is running at now=10s
        expect(cancelEligibility(e, 0, 0, {now}).blockedReason).toBe(
            CancelBlockReason.BEFORE_START_RUNNING
        )
    })

    test('done task is blocked', () => {
        const e = entity([task({duration: 5})]) // completes at 5s, now=10s
        expect(cancelEligibility(e, 0, 0, {now}).blockedReason).toBe(CancelBlockReason.DONE)
    })

    test('unknown lane: count 0, ok false', () => {
        const e = entity([task({})])
        const plan = cancelEligibility(e, 9, 0, {now})
        expect(plan.ok).toBe(false)
        expect(plan.range.count).toBe(0)
    })

    test('multi-task range: 4 tasks, fromIndex 1 yields count 3', () => {
        const e = entity([
            task({duration: 100}),
            task({cancelable: TaskCancelable.ALWAYS, duration: 100}),
            task({cancelable: TaskCancelable.ALWAYS, duration: 100}),
            task({cancelable: TaskCancelable.ALWAYS, duration: 100}),
        ])
        const plan = cancelEligibility(e, 0, 1, {now})
        expect(plan.ok).toBe(true)
        expect(plan.range.count).toBe(3)
        expect(plan.range.taskIndices).toEqual([1, 2, 3])
    })
})

describe('cancelEligibility — grouped tasks', () => {
    const now = new Date('2026-06-19T00:00:10.000Z')
    test('a range of more than one task containing a grouped task is refused', () => {
        const e = entity([task({}), task({group: 42}), task({})])
        expect(cancelEligibility(e, 0, 0, {now}).blockedReason).toBe(
            CancelBlockReason.GROUP_IN_RANGE
        )
    })
    test('task after the grouped one cancels normally', () => {
        const e = entity([task({}), task({group: 42}), task({})])
        expect(cancelEligibility(e, 0, 2, {now}).ok).toBe(true)
    })
    test('a grouped tail needs the group participants', () => {
        const e = entity([task({}), task({group: 42})])
        const plan = cancelEligibility(e, 0, 1, {now})
        expect(plan.blockedReason).toBe(CancelBlockReason.NEEDS)
        expect(plan.needs?.groups).toEqual(['42'])
    })
    test('a grouped tail whose only participant is the entity cancels alone', () => {
        const e = entity([task({}), task({group: 42})])
        const plan = cancelEligibility(e, 0, 1, {
            now,
            groupParticipants: new Map([['42', ['1']]]),
        })
        expect(plan.ok).toBe(true)
        expect(plan.cascade).toEqual([])
    })
    test('group id 0 is a group', () => {
        const e = entity([task({}), task({group: 0}), task({})])
        expect(cancelEligibility(e, 0, 0, {now}).blockedReason).toBe(
            CancelBlockReason.GROUP_IN_RANGE
        )
    })
})

const HOLD_PULL = 1
const HOLD_BUILD = 4
function loadTask(giverType: string, giverId: number, holdId: number, qty: number) {
    return ServerContract.Types.task.from({
        type: TaskType.LOAD,
        duration: 100,
        cancelable: TaskCancelable.ALWAYS,
        cargo: [{item_id: 101, stats: 0, modules: [], quantity: qty}],
        couplings: [
            {
                counterpart: {entity_type: giverType, entity_id: giverId},
                hold: holdId,
                kind: HOLD_PULL,
            },
        ],
    })
}

function giverSix() {
    const giver = ServerContract.Types.entity_info.from({
        projected_at: 0,
        type: 'warehouse',
        id: 6,
        owner: 'player.gm',
        entity_name: 'Warehouse 6',
        coordinates: {x: 0, y: 0, z: 0},
        item_id: 1,
        cargomass: 0,
        capacity: 1_000_000,
        cargo: [],
        modules: [],
        lanes: [],
        gatherer_lanes: [],
        crafter_lanes: [],
        builder_lanes: [],
        loader_lanes: [],
        holds: [
            {
                id: 1,
                kind: HOLD_PULL,
                counterpart: {entity_type: 'ship', entity_id: 1},
                until: T0,
                incoming_mass: 0,
            },
        ],
    })
    return new Map([['6', giver]])
}

describe('cancelEligibility — effects', () => {
    const now = new Date('2026-06-19T00:00:10.000Z')

    test('abandonsRunning true when the front of range is a running ALWAYS task', () => {
        const e = entity([
            task({
                cancelable: TaskCancelable.ALWAYS,
                type: TaskType.RECHARGE,
                duration: 100,
            }),
        ])
        expect(cancelEligibility(e, 0, 0, {now}).effects.abandonsRunning).toBe(true)
    })

    test('buildplot cancel reports keepsPlotDeposits', () => {
        const e = entity([
            ServerContract.Types.task.from({
                type: TaskType.BUILDPLOT,
                duration: 100,
                cancelable: TaskCancelable.ALWAYS,
                cargo: [],
                couplings: [
                    {
                        counterpart: {entity_type: 'plot', entity_id: 55},
                        hold: 0,
                        kind: HOLD_BUILD,
                    },
                ],
            }),
        ])
        const plan = cancelEligibility(e, 0, 0, {now})
        expect(plan.effects.keepsPlotDeposits?.plot.entity_id.toNumber()).toBe(55)
    })

    test('PULL load cancel refunds cargo to the giver', () => {
        const lt = loadTask('warehouse', 6, 1, 4)
        const upcoming = new Date('2026-06-18T23:59:50.000Z')
        const e = ServerContract.Types.entity_info.from({
            projected_at: 0,
            type: 'ship',
            id: 1,
            owner: 'player.gm',
            entity_name: 'Ship 1',
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: 0,
            cargo: [],
            modules: [],
            lanes: [{lane_key: 0, schedule: {started: T0, tasks: [lt]}}],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        const plan = cancelEligibility(e, 0, 0, {
            now: upcoming,
            counterparts: giverSix(),
        })
        expect(plan.effects.refunds[0]?.giver.entity_id.toNumber()).toBe(6)
        expect(plan.effects.refunds[0]?.cargo[0].quantity.toNumber()).toBe(4)
    })

    test('PULL load cancel populates releasedHolds with kind and counterpart', () => {
        const lt = loadTask('warehouse', 6, 1, 4)
        const upcoming = new Date('2026-06-18T23:59:50.000Z')
        const e = ServerContract.Types.entity_info.from({
            projected_at: 0,
            type: 'ship',
            id: 1,
            owner: 'player.gm',
            entity_name: 'Ship 1',
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: 0,
            cargo: [],
            modules: [],
            lanes: [{lane_key: 0, schedule: {started: T0, tasks: [lt]}}],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        const plan = cancelEligibility(e, 0, 0, {
            now: upcoming,
            counterparts: giverSix(),
        })
        expect(plan.effects.releasedHolds[0]?.kind).toBe(1)
        expect(plan.effects.releasedHolds[0]?.counterpart.entity_id.toNumber()).toBe(6)
    })

    test('uncoupled task emits no releasedHolds entry', () => {
        const upcoming = new Date('2026-06-18T23:59:50.000Z')
        const e = ServerContract.Types.entity_info.from({
            projected_at: 0,
            type: 'ship',
            id: 1,
            owner: 'player.gm',
            entity_name: 'Ship 1',
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: 0,
            cargo: [],
            modules: [],
            lanes: [
                {
                    lane_key: 0,
                    schedule: {
                        started: T0,
                        tasks: [
                            task({
                                cancelable: TaskCancelable.ALWAYS,
                                type: TaskType.LOAD,
                            }),
                        ],
                    },
                },
            ],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        const plan = cancelEligibility(e, 0, 0, {now: upcoming})
        expect(plan.effects.releasedHolds).toHaveLength(0)
        expect(plan.effects.refunds).toHaveLength(0)
    })
})

describe('cancelEligibility — feasibility', () => {
    const upcoming = new Date('2026-06-18T23:59:50.000Z')

    test('WOULD_STRAND when cancelling a producer a later consumer needs', () => {
        const producer = ServerContract.Types.task.from({
            type: TaskType.LOAD,
            duration: 50,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [{item_id: 101, stats: 0, modules: [], quantity: 2}],
            couplings: [],
        })
        const consumer = ServerContract.Types.task.from({
            type: TaskType.CRAFT,
            duration: 50,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [
                {item_id: 101, stats: 0, modules: [], quantity: 2},
                {item_id: 10001, stats: 0, modules: [], quantity: 1},
            ],
            couplings: [],
        })
        const e = ServerContract.Types.entity_info.from({
            projected_at: 0,
            type: 'ship',
            id: 1,
            owner: 'player.gm',
            entity_name: 'S',
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: 0,
            capacity: 1_000_000,
            cargo: [],
            modules: [],
            lanes: [
                {
                    lane_key: 1,
                    schedule: {
                        started: '2026-06-19T00:00:00',
                        tasks: [producer],
                    },
                },
                {
                    lane_key: 2,
                    schedule: {
                        started: '2026-06-19T00:00:00',
                        tasks: [consumer],
                    },
                },
            ],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        expect(cancelEligibility(e, 1, 0, {now: upcoming}).blockedReason).toBe(
            CancelBlockReason.WOULD_STRAND
        )
    })

    test('benign cancel on independent lane does NOT strand', () => {
        const producer = ServerContract.Types.task.from({
            type: TaskType.LOAD,
            duration: 50,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [{item_id: 101, stats: 0, modules: [], quantity: 2}],
            couplings: [],
        })
        const independent = ServerContract.Types.task.from({
            type: TaskType.TRAVEL,
            duration: 50,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [],
            couplings: [],
        })
        const e = ServerContract.Types.entity_info.from({
            projected_at: 0,
            type: 'ship',
            id: 1,
            owner: 'player.gm',
            entity_name: 'S',
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: 0,
            capacity: 1_000_000,
            cargo: [],
            modules: [],
            lanes: [
                {
                    lane_key: 1,
                    schedule: {
                        started: '2026-06-19T00:00:00',
                        tasks: [producer],
                    },
                },
                {
                    lane_key: 2,
                    schedule: {
                        started: '2026-06-19T00:00:00',
                        tasks: [independent],
                    },
                },
            ],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        expect(cancelEligibility(e, 2, 0, {now: upcoming}).ok).toBe(true)
    })

    test('WOULD_STRAND when cancelling producer of a MODULAR cargo the consumer needs', () => {
        const moduledCargo = {
            item_id: 101,
            stats: 0,
            modules: [{type: 3}],
            quantity: 2,
        }
        const producer = ServerContract.Types.task.from({
            type: TaskType.LOAD,
            duration: 50,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [moduledCargo],
            couplings: [],
        })
        const consumer = ServerContract.Types.task.from({
            type: TaskType.CRAFT,
            duration: 50,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [moduledCargo, {item_id: 10001, stats: 0, modules: [], quantity: 1}],
            couplings: [],
        })
        const e = ServerContract.Types.entity_info.from({
            projected_at: 0,
            type: 'ship',
            id: 1,
            owner: 'player.gm',
            entity_name: 'S',
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: 0,
            capacity: 1_000_000,
            cargo: [],
            modules: [],
            lanes: [
                {
                    lane_key: 1,
                    schedule: {
                        started: '2026-06-19T00:00:00',
                        tasks: [producer],
                    },
                },
                {
                    lane_key: 2,
                    schedule: {
                        started: '2026-06-19T00:00:00',
                        tasks: [consumer],
                    },
                },
            ],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        expect(cancelEligibility(e, 1, 0, {now: upcoming}).blockedReason).toBe(
            CancelBlockReason.WOULD_STRAND
        )
    })
})

describe('cancelEligibility — cross-entity strand (counterpart queued consumer)', () => {
    const upcoming = new Date('2026-06-18T23:59:50.000Z')

    function entityWithId(
        id: number,
        tasks: ReturnType<typeof ServerContract.Types.task.from>[],
        cargo: {
            id: number
            item_id: number
            stats: number
            modules: never[]
            quantity: number
        }[] = [],
        holds: unknown[] = []
    ) {
        return ServerContract.Types.entity_info.from({
            projected_at: 0,
            type: 'ship',
            id,
            owner: 'player.gm',
            entity_name: `Ship ${id}`,
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: 0,
            capacity: 1_000_000,
            cargo,
            modules: [],
            lanes: [{lane_key: 0, schedule: {started: T0, tasks}}],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds,
        })
    }

    const pushHold = {
        id: 1,
        kind: HoldKind.PUSH,
        counterpart: {entity_type: 'ship', entity_id: 1},
        until: '2026-06-19T00:00:50',
        incoming_mass: 0,
    }

    function pushTask() {
        return ServerContract.Types.task.from({
            type: TaskType.UNLOAD,
            duration: 50,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [{item_id: 101, stats: 0, modules: [], quantity: 2}],
            couplings: [
                {
                    counterpart: {entity_type: 'ship', entity_id: 2},
                    hold: 1,
                    kind: HoldKind.PUSH,
                },
            ],
        })
    }

    function craftConsumerTask() {
        return ServerContract.Types.task.from({
            type: TaskType.CRAFT,
            duration: 100,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [
                {item_id: 101, stats: 0, modules: [], quantity: 2},
                {item_id: 10001, stats: 0, modules: [], quantity: 1},
            ],
            couplings: [],
        })
    }

    function upgradeConsumerTask() {
        return ServerContract.Types.task.from({
            type: TaskType.UPGRADE,
            duration: 100,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [{item_id: 101, stats: 0, modules: [], quantity: 2}],
            couplings: [],
        })
    }

    test('blocked: counterpart consumer loses coverage without this delivery', () => {
        const producer = entityWithId(1, [pushTask()])
        const counterpart = entityWithId(2, [craftConsumerTask()], [], [pushHold])
        const plan = cancelEligibility(producer, 0, 0, {
            now: upcoming,
            counterparts: new Map([['2', counterpart]]),
        })
        expect(plan.ok).toBe(false)
        expect(plan.blockedReason).toBe(CancelBlockReason.WOULD_STRAND_COUNTERPART)
        expect(plan.blockedByCounterpart?.entity_id.toNumber()).toBe(2)
    })

    test('blocked: counterpart upgrade consumer loses coverage without this delivery', () => {
        const producer = entityWithId(1, [pushTask()])
        const counterpart = entityWithId(2, [upgradeConsumerTask()], [], [pushHold])
        const plan = cancelEligibility(producer, 0, 0, {
            now: upcoming,
            counterparts: new Map([['2', counterpart]]),
        })
        expect(plan.ok).toBe(false)
        expect(plan.blockedReason).toBe(CancelBlockReason.WOULD_STRAND_COUNTERPART)
        expect(plan.blockedByCounterpart?.entity_id.toNumber()).toBe(2)
    })

    test('allowed: counterpart upgrade consumer already covered on-hand', () => {
        const producer = entityWithId(1, [pushTask()])
        const counterpart = entityWithId(
            2,
            [upgradeConsumerTask()],
            [{id: 1, item_id: 101, stats: 0, modules: [], quantity: 2}],
            [pushHold]
        )
        const plan = cancelEligibility(producer, 0, 0, {
            now: upcoming,
            counterparts: new Map([['2', counterpart]]),
        })
        expect(plan.ok).toBe(true)
    })

    test('allowed: counterpart consumer already covered on-hand (surplus coverage)', () => {
        const producer = entityWithId(1, [pushTask()])
        const counterpart = entityWithId(
            2,
            [craftConsumerTask()],
            [{id: 1, item_id: 101, stats: 0, modules: [], quantity: 2}],
            [pushHold]
        )
        const plan = cancelEligibility(producer, 0, 0, {
            now: upcoming,
            counterparts: new Map([['2', counterpart]]),
        })
        expect(plan.ok).toBe(true)
    })

    test('needs: counterpart data not loaded names the counterpart', () => {
        const producer = entityWithId(1, [pushTask()])
        const plan = cancelEligibility(producer, 0, 0, {now: upcoming})
        expect(plan.ok).toBe(false)
        expect(plan.blockedReason).toBe(CancelBlockReason.NEEDS)
        expect(plan.needs?.entities).toEqual(['2'])
    })

    test('allowed: counterpart has no queued consumer', () => {
        const producer = entityWithId(1, [pushTask()])
        const idleCounterpart = entityWithId(2, [], [], [pushHold])
        const plan = cancelEligibility(producer, 0, 0, {
            now: upcoming,
            counterparts: new Map([['2', idleCounterpart]]),
        })
        expect(plan.ok).toBe(true)
    })
})

describe('cancel refusal coverage', () => {
    test('every contract cancel refusal maps to a CancelBlockReason', () => {
        for (const message of CANCEL_REFUSALS) {
            expect({
                message,
                reason: CANCEL_REFUSAL_REASONS.get(message),
            }).toEqual({
                message,
                reason: expect.any(String),
            })
        }
    })

    test('every mapped message is a listed refusal and every reason has a message', () => {
        for (const message of CANCEL_REFUSAL_REASONS.keys())
            expect(CANCEL_REFUSALS).toContain(message)
        for (const reason of Object.values(CancelBlockReason)) {
            if (reason === CancelBlockReason.NEEDS || reason === CancelBlockReason.INCONSISTENT)
                continue
            expect({reason, message: cancelRefusalMessage(reason)}).toEqual({
                reason,
                message: expect.any(String),
            })
        }
    })
})

describe('cancelEligibility — returned cargo', () => {
    const upcoming = new Date('2026-06-18T23:59:50.000Z')

    function row(over: {
        id: number
        type?: string
        capacity?: number
        cargomass?: number
        tasks?: ReturnType<typeof ServerContract.Types.task.from>[]
        holds?: unknown[]
    }) {
        return ServerContract.Types.entity_info.from({
            projected_at: 0,
            type: over.type ?? 'ship',
            id: over.id,
            owner: 'player.gm',
            entity_name: `E${over.id}`,
            coordinates: {x: 0, y: 0, z: 0},
            item_id: 1,
            cargomass: over.cargomass ?? 0,
            ...(over.capacity !== undefined ? {capacity: over.capacity} : {}),
            cargo: [],
            modules: [],
            lanes: over.tasks
                ? [
                      {
                          lane_key: 0,
                          schedule: {started: T0, tasks: over.tasks},
                      },
                  ]
                : [],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            holds: over.holds ?? [],
        })
    }

    function clustercraft() {
        return ServerContract.Types.task.from({
            type: TaskType.CRAFT,
            duration: 100,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [
                {item_id: 101, stats: 0, modules: [], quantity: 2},
                {item_id: 10001, stats: 0, modules: [], quantity: 1},
            ],
            couplings: [
                {
                    counterpart: {entity_type: 'warehouse', entity_id: 3},
                    hold: 5,
                    kind: HoldKind.SOURCE,
                },
            ],
        })
    }

    const crafter = () => row({id: 1, tasks: [clustercraft()]})
    const cluster = {
        root: 10,
        cells: [
            {gx: 1, gy: 0, entity: 1},
            {gx: 2, gy: 0, entity: 3},
        ],
    }
    const world = (memberCapacity: number) => ({
        now: upcoming,
        counterparts: new Map([
            [
                '3',
                row({
                    id: 3,
                    type: 'warehouse',
                    capacity: memberCapacity,
                    cargomass: 1000,
                }),
            ],
            ['10', row({id: 10, type: 'hub'})],
        ]),
        clusters: new Map([['10', cluster]]),
        hubAt: () => '10',
    })

    test('a clustercraft cancel the cluster cannot absorb is refused', () => {
        expect(cancelEligibility(crafter(), 0, 0, world(1000)).blockedReason).toBe(
            CancelBlockReason.CLUSTER_FULL
        )
    })

    test('a clustercraft cancel with room in the origin member is allowed', () => {
        expect(cancelEligibility(crafter(), 0, 0, world(1_000_000)).ok).toBe(true)
    })

    test('a clustercraft cancel needs the hub and its cluster', () => {
        const noHub = cancelEligibility(crafter(), 0, 0, {
            ...world(1_000_000),
            hubAt: undefined,
        })
        expect(noHub.blockedReason).toBe(CancelBlockReason.NEEDS)
        expect(noHub.needs?.hubSites).toEqual([{owner: 'player.gm', x: 0, y: 0}])
        const noCluster = cancelEligibility(crafter(), 0, 0, {
            ...world(1_000_000),
            clusters: undefined,
        })
        expect(noCluster.needs?.hubs).toEqual(['10'])
    })

    test('a pull-cancel from a giver with a pending capper is refused', () => {
        const demolish = ServerContract.Types.task.from({
            type: TaskType.DEMOLISH,
            duration: 100,
            cancelable: TaskCancelable.ALWAYS,
            cargo: [],
            couplings: [],
        })
        const puller = row({
            id: 1,
            capacity: 1_000_000,
            tasks: [loadTask('warehouse', 6, 1, 4)],
        })
        const giver = row({
            id: 6,
            type: 'warehouse',
            capacity: 1_000_000,
            tasks: [demolish],
        })
        const plan = cancelEligibility(puller, 0, 0, {
            now: upcoming,
            counterparts: new Map([['6', giver]]),
        })
        expect(plan.blockedReason).toBe(CancelBlockReason.GIVER_CAPPED)
        expect(plan.blockedByCounterpart?.entity_id.toNumber()).toBe(6)
    })
})
