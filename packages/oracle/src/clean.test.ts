import {expect, test} from 'bun:test'
import {UInt64} from '@wharfkit/antelope'
import {cleanOldestReserveScope, type MaintenanceDeps} from './clean'

function fakeDeps(opts: {
    finalized: number
    scopes: {epoch: number; count: number}[]
    maxRows?: number
}): {deps: MaintenanceDeps; sent: {epoch: number; maxRows: number}[]; maxRows: number} {
    const sent: {epoch: number; maxRows: number}[] = []
    const deps: MaintenanceDeps = {
        reads: {
            getFinalizedEpoch: async () => UInt64.from(opts.finalized),
            getReserveScopes: async () => opts.scopes,
        },
        actions: {
            cleanrsvp: (epoch, maxRows) => {
                sent.push({epoch, maxRows})
                return {name: 'cleanrsvp'} as never
            },
        },
        session: {
            transact: async () => ({}),
        },
    }
    return {deps, sent, maxRows: opts.maxRows ?? 100}
}

test('cleans the oldest scope below the finalized epoch', async () => {
    const {deps, sent, maxRows} = fakeDeps({
        finalized: 5,
        scopes: [
            {epoch: 2, count: 40},
            {epoch: 3, count: 10},
        ],
    })
    const r = await cleanOldestReserveScope(deps, maxRows)
    expect(r).toEqual({kind: 'cleaned', epoch: 2, rows: 40})
    expect(sent).toEqual([{epoch: 2, maxRows: 100}])
})

test('caps reported rows at maxRows', async () => {
    const {deps, maxRows} = fakeDeps({finalized: 5, scopes: [{epoch: 2, count: 500}], maxRows: 100})
    const r = await cleanOldestReserveScope(deps, maxRows)
    expect(r).toEqual({kind: 'cleaned', epoch: 2, rows: 100})
})

test('never targets the current or a future epoch', async () => {
    const {deps, sent, maxRows} = fakeDeps({
        finalized: 3,
        scopes: [
            {epoch: 3, count: 9},
            {epoch: 4, count: 9},
        ],
    })
    const r = await cleanOldestReserveScope(deps, maxRows)
    expect(r).toEqual({kind: 'nothing-to-clean'})
    expect(sent).toEqual([])
})

test('nothing to clean when no scopes', async () => {
    const {deps, sent, maxRows} = fakeDeps({finalized: 5, scopes: []})
    const r = await cleanOldestReserveScope(deps, maxRows)
    expect(r).toEqual({kind: 'nothing-to-clean'})
    expect(sent).toEqual([])
})
