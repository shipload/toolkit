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
    it('parses a landed row: cargo is the output, no inputs, status derived', async () => {
        const m = managerWith(
            async () => [row()],
            async () => []
        )
        const jobs = await m.getOwnedJobs(OWNER, {now: new Date('2026-07-26T11:30:00Z')})
        expect(jobs).toHaveLength(1)
        expect(jobs[0]).toMatchObject({id: 7, building: 42, quantity: 5, status: 'ready'})
        expect(jobs[0].coords).toEqual({x: 12, y: 34})
        expect(jobs[0].output).toEqual({item: 'out'} as never)
        expect(jobs[0].inputs).toEqual([] as never)
    })

    it('reports a job In Line rather than ready, whatever its zero window says', async () => {
        const inLine = row({
            starts_at: {toDate: () => new Date(0)},
            completes_at: {toDate: () => new Date(0)},
            deposited: false,
            cargo: [{item: 'in'}],
        })
        const m = managerWith(
            async () => [inLine],
            async () => []
        )
        const jobs = await m.getOwnedJobs(OWNER, {now: new Date('2026-07-26T11:30:00Z')})
        expect(jobs[0].status).toBe('inline')
        expect(jobs[0].deposited).toBe(false)
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
