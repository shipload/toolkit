import {UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {expect, test} from 'bun:test'
import type {ServerContract} from '../contracts'
import {encodeStats} from '../derivation/crafting'
import {ITEM_DEPOT_T1_PACKED, ITEM_LOADER_T1, ITEM_STORAGE_T1} from '../data/item-ids'
import {JOB_QUEUE_CAP} from '../scheduling/jobs'
import {HoldKind, TaskType} from '../types'
import {
    civicShuttleBays,
    civicTransfersAtCap,
    civicTransfersFrom,
    pendingCivicTransfers,
    selectCivicShuttleBay,
    CIVIC_TRANSFER_PER_PLAYER_CAP,
} from './civic-shuttle'

type Lane = ServerContract.Types.lane
type ModuleEntry = ServerContract.Types.module_entry
type Task = ServerContract.Types.task

const T0 = new Date('2026-01-01T00:00:00.000Z')
const loaderStats = encodeStats([300, 500])
const storageStats = encodeStats([300, 300])

function makeModuleEntry(itemId: number, stats: bigint): ModuleEntry {
    return {
        type: UInt8.from(0),
        installed: {item_id: UInt16.from(itemId), stats: UInt64.from(stats)},
    } as unknown as ModuleEntry
}

// The live Depot layout: two loader bays then four storage.
function depotModules(): ModuleEntry[] {
    return [
        makeModuleEntry(ITEM_LOADER_T1, loaderStats),
        makeModuleEntry(ITEM_LOADER_T1, loaderStats),
        makeModuleEntry(ITEM_STORAGE_T1, storageStats),
        makeModuleEntry(ITEM_STORAGE_T1, storageStats),
        makeModuleEntry(ITEM_STORAGE_T1, storageStats),
        makeModuleEntry(ITEM_STORAGE_T1, storageStats),
    ]
}

function shuttleTask(senderId: number, receiverId: number, group?: number): Task {
    return {
        type: UInt8.from(TaskType.SHUTTLE),
        duration: UInt32.from(60),
        cancelable: UInt8.from(2),
        cargo: [],
        couplings: [
            {
                counterpart: {entity_id: UInt64.from(senderId), entity_type: UInt8.from(1)},
                hold: UInt64.from(1),
                kind: UInt8.from(HoldKind.PULL),
            },
            {
                counterpart: {entity_id: UInt64.from(receiverId), entity_type: UInt8.from(1)},
                hold: UInt64.from(1),
                kind: UInt8.from(HoldKind.PUSH),
            },
        ],
        entitygroup: group === undefined ? undefined : UInt64.from(group),
    } as unknown as Task
}

function makeLane(laneKey: number, tasks: Task[]): Lane {
    return {
        lane_key: UInt8.from(laneKey),
        schedule: {started: {toDate: () => T0}, tasks},
    } as unknown as Lane
}

test('civicShuttleBays lists both Depot bays with their queue depth', () => {
    const lanes = [makeLane(1, [shuttleTask(20, 21)])]
    const bays = civicShuttleBays(depotModules(), ITEM_DEPOT_T1_PACKED, lanes)
    expect(bays.map((b) => b.laneKey)).toEqual([1, 2])
    expect(bays.map((b) => b.slotIndex)).toEqual([0, 1])
    expect(bays[0].queued).toBe(1)
    expect(bays[1].queued).toBe(0)
    expect(bays.every((b) => !b.full)).toBe(true)
    expect(bays.every((b) => b.thrust > 0 && b.mass > 0)).toBe(true)
})

test('a bay is full at the job queue cap', () => {
    const filled = Array.from({length: JOB_QUEUE_CAP}, () => shuttleTask(20, 21))
    const bays = civicShuttleBays(depotModules(), ITEM_DEPOT_T1_PACKED, [makeLane(1, filled)])
    expect(bays[0].full).toBe(true)
    expect(bays[1].full).toBe(false)
})

test('selectCivicShuttleBay takes the first free bay, then the lowest occupied one', () => {
    const modules = depotModules()
    expect(selectCivicShuttleBay(modules, ITEM_DEPOT_T1_PACKED, [])?.laneKey).toBe(1)

    const firstBusy = [makeLane(1, [shuttleTask(20, 21)])]
    expect(selectCivicShuttleBay(modules, ITEM_DEPOT_T1_PACKED, firstBusy)?.laneKey).toBe(2)

    const bothBusy = [makeLane(1, [shuttleTask(20, 21)]), makeLane(2, [shuttleTask(22, 23)])]
    expect(selectCivicShuttleBay(modules, ITEM_DEPOT_T1_PACKED, bothBusy)?.laneKey).toBe(1)
})

test('selectCivicShuttleBay returns nothing when the building has no loaders', () => {
    const modules = [makeModuleEntry(ITEM_STORAGE_T1, storageStats)]
    expect(selectCivicShuttleBay(modules, ITEM_DEPOT_T1_PACKED, [])).toBeUndefined()
})

test('pendingCivicTransfers reports the bay, both counterparties, and the tail', () => {
    const lanes = [
        makeLane(1, [shuttleTask(20, 21), shuttleTask(22, 23)]),
        makeLane(2, [shuttleTask(24, 25)]),
    ]
    const transfers = pendingCivicTransfers({lanes} as never)
    expect(transfers.length).toBe(3)

    const first = transfers.find((t) => String(t.senderId) === '20')!
    expect(first.laneKey).toBe(1)
    expect(String(first.receiverId)).toBe('21')
    expect(first.isTail).toBe(false)
    expect(first.callable).toBe(false)
    expect(first.startsAt).toEqual(T0)
    expect(first.completesAt).toEqual(new Date(T0.getTime() + 60_000))

    const second = transfers.find((t) => String(t.senderId) === '22')!
    expect(second.isTail).toBe(true)
    expect(second.callable).toBe(true)

    const onBayTwo = transfers.find((t) => String(t.senderId) === '24')!
    expect(onBayTwo.laneKey).toBe(2)
    expect(onBayTwo.callable).toBe(true)
})

test('a grouped tail transfer is not callable', () => {
    const lanes = [makeLane(1, [shuttleTask(20, 21, 7)])]
    const [transfer] = pendingCivicTransfers({lanes} as never)
    expect(transfer.isTail).toBe(true)
    expect(transfer.callable).toBe(false)
})

test('civicTransfersFrom counts only the ships a player sends from', () => {
    const lanes = [
        makeLane(1, [shuttleTask(20, 21), shuttleTask(30, 31)]),
        makeLane(2, [shuttleTask(22, 23)]),
    ]
    const entity = {lanes} as never
    expect(civicTransfersFrom(entity, [20, 22]).length).toBe(2)
    expect(civicTransfersFrom(entity, [30]).length).toBe(1)
    expect(civicTransfersFrom(entity, [99]).length).toBe(0)
})

test('civicTransfersAtCap trips at the per-player cap', () => {
    const mine = Array.from({length: CIVIC_TRANSFER_PER_PLAYER_CAP}, (_, i) =>
        shuttleTask(20 + i, 50)
    )
    const senderIds = mine.map((_, i) => 20 + i)
    const under = {lanes: [makeLane(1, mine.slice(0, -1))]} as never
    const at = {lanes: [makeLane(1, mine)]} as never
    expect(civicTransfersAtCap(under, senderIds)).toBe(false)
    expect(civicTransfersAtCap(at, senderIds)).toBe(true)
})
