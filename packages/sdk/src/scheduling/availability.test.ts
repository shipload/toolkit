import {describe, expect, test} from 'bun:test'
import {HoldKind, ServerContract, TaskType} from '../index-module'
import {
    calcCounterpartDelivery,
    cargoReadyAt,
    type CargoInput,
    type IncomingSource,
    projectedCargoAvailableAt,
} from './availability'

const T0 = '2026-06-19T00:00:00'
const EPOCH = new Date(0)

function cargoItem(itemId: number, stats: number, quantity: number) {
    return ServerContract.Types.cargo_item.from({item_id: itemId, stats, modules: [], quantity})
}

function task(over: {type?: number; duration?: number; cargo?: ReturnType<typeof cargoItem>[]}) {
    return ServerContract.Types.task.from({
        type: over.type ?? TaskType.LOAD,
        duration: over.duration ?? 60,
        cancelable: 0,
        cargo: over.cargo ?? [],
        couplings: [],
    })
}

function coupling(kind: number) {
    return ServerContract.Types.coupling.from({
        counterpart: {entity_type: 'ship', entity_id: 2},
        hold: 1,
        kind,
    })
}

function entity(
    cargo: ReturnType<typeof cargoItem>[],
    tasks: ReturnType<typeof task>[] = [],
    startedISO = T0
) {
    return ServerContract.Types.entity_info.from({
        type: 'ship',
        id: 1,
        owner: 'player.gm',
        entity_name: 'Ship 1',
        coordinates: {x: 0, y: 0, z: 0},
        item_id: 1,
        cargomass: 0,
        cargo: cargo.map((c) => ({
            item_id: c.item_id,
            stats: c.stats,
            modules: c.modules,
            quantity: c.quantity,
            id: 0,
        })),
        modules: [],
        lanes: [{lane_key: 0, schedule: {started: startedISO, tasks}}],
        gatherer_lanes: [],
        crafter_lanes: [],
        builder_lanes: [],
        loader_lanes: [],
        holds: [],
    })
}

describe('cargoReadyAt', () => {
    test('on-hand covers demand → epoch', () => {
        const e = entity([cargoItem(7, 0, 10)])
        const demand: CargoInput[] = [{itemId: 7, stats: 0n, quantity: 5}]
        expect(cargoReadyAt(e, demand)).toEqual(EPOCH)
    })

    test('own-lane LOAD covers demand → its completion', () => {
        const loadCompletesAt = new Date('2026-06-19T00:01:00.000Z')
        const e = entity(
            [],
            [task({type: TaskType.LOAD, duration: 60, cargo: [cargoItem(7, 0, 10)]})]
        )
        const demand: CargoInput[] = [{itemId: 7, stats: 0n, quantity: 5}]
        expect(cargoReadyAt(e, demand)).toEqual(loadCompletesAt)
    })

    test('incoming source covers demand → its until', () => {
        const until = new Date('2026-06-19T00:00:30.000Z')
        const e = entity([])
        const incoming: IncomingSource[] = [{holdId: '1', until, items: [cargoItem(7, 0, 10)]}]
        const demand: CargoInput[] = [{itemId: 7, stats: 0n, quantity: 5}]
        expect(cargoReadyAt(e, demand, incoming)).toEqual(until)
    })

    test('on-hand covers demand; unrelated same-item different-stats inflow does not delay readiness', () => {
        const laterCompletesAt = new Date('2026-06-19T00:01:00.000Z')
        const e = entity(
            [cargoItem(7, 0, 10)],
            [task({type: TaskType.LOAD, duration: 60, cargo: [cargoItem(7, 99, 10)]})]
        )
        const demand: CargoInput[] = [{itemId: 7, stats: 0n, quantity: 5}]
        const result = cargoReadyAt(e, demand)
        expect(result).toEqual(EPOCH)
        expect(result).not.toEqual(laterCompletesAt)
    })
})

describe('calcCounterpartDelivery', () => {
    test('coupled CRAFT task returns output cargo only', () => {
        const output = cargoItem(9, 0, 1)
        const t = task({
            type: TaskType.CRAFT,
            cargo: [cargoItem(7, 0, 2), cargoItem(8, 0, 1), output],
        })
        const result = calcCounterpartDelivery(t, coupling(HoldKind.PUSH))
        expect(result.length).toBe(1)
        expect(result[0].item_id.toNumber()).toBe(9)
    })

    test('CRAFT task with empty cargo returns []', () => {
        const t = task({type: TaskType.CRAFT, cargo: []})
        expect(calcCounterpartDelivery(t, coupling(HoldKind.PUSH))).toEqual([])
    })

    test('coupled UNLOAD task returns whole cargo', () => {
        const t = task({type: TaskType.UNLOAD, cargo: [cargoItem(7, 0, 2), cargoItem(8, 0, 1)]})
        const result = calcCounterpartDelivery(t, coupling(HoldKind.GATHER))
        expect(result.length).toBe(2)
    })

    test('non-incoming coupling kind returns []', () => {
        const t = task({type: TaskType.UNLOAD, cargo: [cargoItem(7, 0, 2)]})
        expect(calcCounterpartDelivery(t, coupling(HoldKind.PULL))).toEqual([])
    })
})

describe('projectedCargoAvailableAt — incoming', () => {
    const until = new Date('2026-06-19T00:00:30.000Z')

    function incomingFor(qty: number): IncomingSource[] {
        return [{holdId: '1', until, items: [cargoItem(7, 0, qty)]}]
    }

    test('credits an incoming source strictly before its until', () => {
        const e = entity([])
        const avail = projectedCargoAvailableAt(e, new Date(until.getTime() + 1), incomingFor(10))
        expect(avail.get('7:0')).toBe(10n)
    })

    test('does not credit an incoming source at exactly its until', () => {
        const e = entity([])
        const avail = projectedCargoAvailableAt(e, until, incomingFor(10))
        expect(avail.get('7:0') ?? 0n).toBe(0n)
    })

    test('does not credit an incoming source before its until', () => {
        const e = entity([])
        const avail = projectedCargoAvailableAt(e, new Date(until.getTime() - 1), incomingFor(10))
        expect(avail.get('7:0') ?? 0n).toBe(0n)
    })
})
