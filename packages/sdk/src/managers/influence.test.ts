import {describe, expect, it} from 'bun:test'
import {Name, UInt64} from '@wharfkit/antelope'
import {InfluenceManager} from './influence'
import {coordsToLocationId} from '../types'

const LOCATION = {x: 12, y: 34}

function managerWith(rowsByTable: Record<string, unknown[]>) {
    const calls: {table: string; scope: unknown}[] = []
    const table = (name: string, scope: unknown) => {
        calls.push({table: name, scope})
        return {all: async () => rowsByTable[name] ?? []}
    }
    const ctx = {server: {table}} as never
    return {manager: new InfluenceManager(ctx), calls}
}

describe('InfluenceManager scoped table reads', () => {
    it('getVoteCasts scopes infvote by location and maps fields', async () => {
        const {manager, calls} = managerWith({
            infvote: [{account: Name.from('eggmaple.gm'), epoch: 5, node_id: 2, weight: '100'}],
        })
        const rows = await manager.getVoteCasts(LOCATION)
        expect(calls).toHaveLength(1)
        expect(calls[0].table).toBe('infvote')
        expect(UInt64.from(calls[0].scope as never).equals(coordsToLocationId(LOCATION))).toBe(true)
        expect(rows).toEqual([
            {account: Name.from('eggmaple.gm'), epoch: 5, nodeId: 2, weight: 100n},
        ])
    })

    it('getVoteTallies scopes inftally by location and maps fields', async () => {
        const {manager, calls} = managerWith({
            inftally: [{node_id: 3, total: '250'}],
        })
        const rows = await manager.getVoteTallies(LOCATION)
        expect(calls[0].table).toBe('inftally')
        expect(UInt64.from(calls[0].scope as never).equals(coordsToLocationId(LOCATION))).toBe(true)
        expect(rows).toEqual([{nodeId: 3, total: 250n}])
    })

    it('getBuiltCharters scopes charters by location and maps fields', async () => {
        const {manager, calls} = managerWith({
            charters: [{node_id: 1, entity_id: '9001'}],
        })
        const rows = await manager.getBuiltCharters(LOCATION)
        expect(calls[0].table).toBe('charters')
        expect(UInt64.from(calls[0].scope as never).equals(coordsToLocationId(LOCATION))).toBe(true)
        expect(rows).toEqual([{nodeId: 1, entityId: 9001n}])
    })

    it('returns an empty array when the scope has no rows', async () => {
        const {manager} = managerWith({})
        expect(await manager.getVoteCasts(LOCATION)).toEqual([])
        expect(await manager.getVoteTallies(LOCATION)).toEqual([])
        expect(await manager.getBuiltCharters(LOCATION)).toEqual([])
    })
})
