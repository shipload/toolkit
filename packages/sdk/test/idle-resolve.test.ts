import {describe, expect, test} from 'bun:test'
import {Name, UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {Chains} from '@wharfkit/common'
import {Shipload} from '../src'
import {ServerContract} from '../src/contracts'
import {HoldKind, TaskType} from '../src/types'
import {composeIdleResolve} from '../src/scheduling/idle-resolve'

const sl = new Shipload(Chains.Jungle4)

const NOW = new Date('2026-06-16T12:00:00.000Z')
const PAST = new Date('2026-06-16T11:00:00.000Z')

function task(type: TaskType, duration: number) {
    return {
        type,
        duration,
        cancelable: 2,
        coordinates: null,
        cargo: [],
        couplings: [],
        entitygroup: null,
        energy_cost: null,
    }
}

// A single mobility lane started in the past; one task of `duration` seconds.
function lane(durationSec: number, started: Date) {
    return ServerContract.Types.lane.from({
        lane_key: UInt8.from(0),
        schedule: {
            started: started.toISOString().slice(0, -1),
            tasks: [task(TaskType.LOAD, durationSec)],
        },
    })
}

function holdOn(counterpartId: number, kind: HoldKind = HoldKind.PULL) {
    return ServerContract.Types.hold.from({
        id: UInt64.from(1),
        kind: UInt8.from(kind),
        counterpart: ServerContract.Types.entity_ref.from({
            entity_type: Name.from('warehouse'),
            entity_id: UInt64.from(counterpartId),
        }),
        until: NOW.toISOString().slice(0, -1),
        incoming_mass: UInt32.from(0),
    })
}

function entity(
    id: number,
    opts: {lanes?: ServerContract.Types.lane[]; holds?: ServerContract.Types.hold[]} = {}
): ServerContract.Types.entity_info {
    return ServerContract.Types.entity_info.from({
        id: UInt64.from(id),
        owner: Name.from('alice'),
        type: Name.from('warehouse'),
        entity_name: '',
        coordinates: ServerContract.Types.coordinates.from({x: 0, y: 0}),
        cargomass: UInt32.from(0),
        cargo: [],
        modules: [],
        item_id: UInt16.from(0),
        lanes: opts.lanes ?? [],
        gatherer_lanes: [],
        crafter_lanes: [],
        loader_lanes: [],
        holds: opts.holds ?? [],
    })
}

const ACTION = sl.actions.warp(99, {x: 1, y: 2})

function resolvedIds(actions: ReturnType<typeof composeIdleResolve>): string[] {
    return actions
        .filter((a) => String(a.name) === 'resolve')
        .map((a) => String(a.decodeData(ServerContract.abi).id))
}

describe('composeIdleResolve', () => {
    test('own completed-but-unresolved lane task resolves the blocker itself', () => {
        // started 1h ago, 60s task → long done by NOW.
        const blocker = entity(5, {lanes: [lane(60, PAST)]})
        const result = composeIdleResolve(blocker, ACTION, sl.actions, NOW)

        expect(result.length).toBe(2)
        expect(String(result[0].account)).toBe('eon.shipload')
        expect(String(result[0].name)).toBe('resolve')
        expect(resolvedIds(result)).toEqual(['5'])
        expect(result[result.length - 1]).toBe(ACTION)
    })

    test('giver of a pull resolves the COUNTERPART, not the blocker', () => {
        const blocker = entity(5, {holds: [holdOn(7)]})
        const counterpart = entity(7, {lanes: [lane(60, PAST)]})
        const lookup = (cid: UInt64) => (cid.equals(UInt64.from(7)) ? counterpart : undefined)
        const result = composeIdleResolve(blocker, ACTION, sl.actions, NOW, lookup)

        expect(resolvedIds(result)).toEqual(['7'])
        expect(resolvedIds(result)).not.toContain('5')
        expect(result[result.length - 1]).toBe(ACTION)
    })

    test('own resolvable task plus a hold on a different counterpart emits both, deduped, action last', () => {
        const blocker = entity(5, {lanes: [lane(60, PAST)], holds: [holdOn(7)]})
        const counterpart = entity(7, {lanes: [lane(60, PAST)]})
        const lookup = (cid: UInt64) => (cid.equals(UInt64.from(7)) ? counterpart : undefined)
        const result = composeIdleResolve(blocker, ACTION, sl.actions, NOW, lookup)

        expect(result.length).toBe(3)
        expect(resolvedIds(result).sort()).toEqual(['5', '7'])
        expect(result[result.length - 1]).toBe(ACTION)
    })

    test('lookupCounterpart gates: an in-flight counterpart is not resolved', () => {
        const blocker = entity(5, {holds: [holdOn(7)]})
        // counterpart 7 task started 1h ago but lasts 2h → still running.
        const counterpart = entity(7, {lanes: [lane(7200, PAST)]})
        const lookup = (cid: UInt64) => (cid.equals(UInt64.from(7)) ? counterpart : undefined)

        const result = composeIdleResolve(blocker, ACTION, sl.actions, NOW, lookup)

        expect(resolvedIds(result)).toEqual([])
        expect(result.length).toBe(1)
        expect(result[0]).toBe(ACTION)
    })

    test('lookupCounterpart gates: a done counterpart is resolved', () => {
        const blocker = entity(5, {holds: [holdOn(7)]})
        const counterpart = entity(7, {lanes: [lane(60, PAST)]})
        const lookup = (cid: UInt64) => (cid.equals(UInt64.from(7)) ? counterpart : undefined)

        const result = composeIdleResolve(blocker, ACTION, sl.actions, NOW, lookup)

        expect(resolvedIds(result)).toEqual(['7'])
    })

    test('without lookupCounterpart, a hold counterpart is not resolved (it may be in-flight)', () => {
        const blocker = entity(5, {holds: [holdOn(7)]})
        const result = composeIdleResolve(blocker, ACTION, sl.actions, NOW)

        expect(resolvedIds(result)).toEqual([])
        expect(result.length).toBe(1)
        expect(result[0]).toBe(ACTION)
    })

    test('dedup: blocker self-resolvable AND a hold whose counterpart IS the blocker → single resolve', () => {
        const blocker = entity(5, {lanes: [lane(60, PAST)], holds: [holdOn(5)]})
        const lookup = (cid: UInt64) => (cid.equals(UInt64.from(5)) ? blocker : undefined)
        const result = composeIdleResolve(blocker, ACTION, sl.actions, NOW, lookup)

        expect(resolvedIds(result)).toEqual(['5'])
        expect(result.length).toBe(2)
    })
})
