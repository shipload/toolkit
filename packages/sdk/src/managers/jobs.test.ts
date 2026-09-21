import {describe, expect, it} from 'bun:test'
import {Name} from '@wharfkit/antelope'
import {JobsManager} from './jobs'

const OWNER = 'eggmaple.gm'
const row = (over: Record<string, unknown> = {}) => ({
    id: {toNumber: () => 7},
    building: {toNumber: () => 42},
    socket: {toNumber: () => 0},
    owner: Name.from(OWNER),
    ship_id: {toNumber: () => 100},
    coords: {x: {toNumber: () => 12}, y: {toNumber: () => 34}},
    starts_at: {toDate: () => new Date('2026-07-26T10:00:00Z')},
    completes_at: {toDate: () => new Date('2026-07-26T11:00:00Z')},
    arrives_at: {toDate: () => new Date('2026-07-26T09:45:00Z')},
    recipe_id: {toNumber: () => 10001},
    quantity: {toNumber: () => 5},
    energy_paid: {toNumber: () => 0},
    cargo: [{item: 'out'}],
    ...over,
})

function managerWith(queryImpl: () => Promise<unknown[]>, allImpl: () => Promise<unknown[]>) {
    const table = () => ({query: () => ({all: queryImpl}), all: allImpl})
    const ctx = {server: {table}} as never
    return new JobsManager(ctx)
}

describe('JobsManager.getOwnedJobs', () => {
    it('parses a deposited row: inputs then the output tail, status derived', async () => {
        const m = managerWith(
            async () => [row({cargo: [{item: 'in'}, {item: 'out'}]})],
            async () => []
        )
        const jobs = await m.getOwnedJobs(OWNER, {now: new Date('2026-07-26T11:30:00Z')})
        expect(jobs).toHaveLength(1)
        expect(jobs[0]).toMatchObject({id: 7, building: 42, quantity: 5, status: 'ready'})
        expect(jobs[0].arrivesAt).toEqual(new Date('2026-07-26T09:45:00Z'))
        expect(jobs[0].coords).toEqual({x: 12, y: 34})
        expect(jobs[0].output).toEqual({item: 'out'} as never)
        expect(jobs[0].inputs).toEqual([{item: 'in'}] as never)
    })

    it('reports an undeposited row as dropping off, whatever its window says', async () => {
        const inFlight = row({
            deposited: false,
            cargo: [{item: 'in'}],
        })
        const m = managerWith(
            async () => [inFlight],
            async () => []
        )
        const jobs = await m.getOwnedJobs(OWNER, {now: new Date('2026-07-26T11:30:00Z')})
        expect(jobs[0].status).toBe('dropping')
        expect(jobs[0].deposited).toBe(false)
        expect(jobs[0].output).toBeNull()
        expect(jobs[0].inputs).toEqual([{item: 'in'}] as never)
    })

    it('reports a cancelled row as ready with its inputs held', async () => {
        const cancelled = row({
            quantity: {toNumber: () => 0},
            deposited: true,
            cargo: [{item: 'in'}],
        })
        const m = managerWith(
            async () => [cancelled],
            async () => []
        )
        const jobs = await m.getOwnedJobs(OWNER, {now: new Date('2026-07-26T09:00:00Z')})
        expect(jobs[0].status).toBe('ready')
        expect(jobs[0].output).toBeNull()
        expect(jobs[0].inputs).toEqual([{item: 'in'}] as never)
    })

    it('drops rows whose owner does not match (positional-index safety re-filter)', async () => {
        const other = row({owner: Name.from('someoneelse.gm')})
        const m = managerWith(
            async () => [row(), other],
            async () => []
        )
        const jobs = await m.getOwnedJobs(OWNER)
        expect(jobs).toHaveLength(1)
    })

    it('falls back to a full-scan .all() when the positional query throws', async () => {
        const m = managerWith(
            async () => {
                throw new Error('bad index_position')
            },
            async () => [row()]
        )
        const jobs = await m.getOwnedJobs(OWNER)
        expect(jobs).toHaveLength(1)
    })
})

const buildRow = (over: Record<string, unknown> = {}) => ({
    id: {toNumber: () => 9},
    building: {toNumber: () => 2},
    socket: {toNumber: () => 1},
    target: {toNumber: () => 5},
    owner: Name.from(OWNER),
    coords: {x: {toNumber: () => 0}, y: {toNumber: () => 0}},
    starts_at: {toDate: () => new Date('2026-07-26T10:00:00Z')},
    completes_at: {toDate: () => new Date('2026-07-26T11:00:00Z')},
    arrives_at: {toDate: () => new Date('2026-07-26T09:45:00Z')},
    target_item_id: {toNumber: () => 10212},
    cargo: [{item: 'in'}],
    deposited: true,
    ...over,
})

function managerWithReadonly(impl: (name: string, data: unknown) => Promise<unknown>) {
    const ctx = {server: {readonly: impl}} as never
    return new JobsManager(ctx)
}

describe('JobsManager.getBuildJobs', () => {
    it('reads the dock queue through getbuildjobs and parses every row', async () => {
        let called: unknown = null
        const m = managerWithReadonly(async (name, data) => {
            called = {name, data}
            return {jobs: [buildRow(), buildRow({id: {toNumber: () => 10}, deposited: false})]}
        })
        const jobs = await m.getBuildJobs(2, {now: new Date('2026-07-26T11:30:00Z')})
        expect(called).toMatchObject({name: 'getbuildjobs'})
        expect(String((called as {data: {building_id: unknown}}).data.building_id)).toBe('2')
        expect(jobs).toHaveLength(2)
        expect(jobs[0]).toMatchObject({
            id: 9,
            building: 2,
            socket: 1,
            targetId: 5,
            owner: OWNER,
            targetItemId: 10212,
            deposited: true,
            status: 'ready',
        })
        expect(jobs[0].coords).toEqual({x: 0, y: 0})
        expect(jobs[0].arrivesAt).toEqual(new Date('2026-07-26T09:45:00Z'))
        expect(jobs[0].inputs).toEqual([{item: 'in'}] as never)
        expect(jobs[1].status).toBe('dropping')
    })

    it('reports a booked row before its window as queued', async () => {
        const m = managerWithReadonly(async () => ({jobs: [buildRow()]}))
        const jobs = await m.getBuildJobs(2, {now: new Date('2026-07-26T09:50:00Z')})
        expect(jobs[0].status).toBe('queued')
    })

    it('returns an empty list when the result carries no jobs', async () => {
        const m = managerWithReadonly(async () => ({}))
        expect(await m.getBuildJobs(2)).toEqual([])
    })
})
