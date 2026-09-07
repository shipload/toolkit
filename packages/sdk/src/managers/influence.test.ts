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
    it('getBallotVotes scopes ballotvote by ballot id and maps fields', async () => {
        const {manager, calls} = managerWith({
            ballotvote: [{account: Name.from('eggmaple.gm'), picks: [2, 1]}],
        })
        const rows = await manager.getBallotVotes(7n)
        expect(calls).toHaveLength(1)
        expect(calls[0].table).toBe('ballotvote')
        expect(UInt64.from(calls[0].scope as never).equals(UInt64.from(7))).toBe(true)
        expect(rows).toEqual([{account: Name.from('eggmaple.gm'), picks: [2, 1]}])
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
        expect(await manager.getBallotVotes(7n)).toEqual([])
        expect(await manager.getBuiltCharters(LOCATION)).toEqual([])
    })
})
