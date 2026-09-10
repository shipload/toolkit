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
    it('getBallotVotes scopes ballotpicks by ballot id and maps fields', async () => {
        const {manager, calls} = managerWith({
            ballotpicks: [{account: Name.from('eggmaple.gm'), picks: [2, 1]}],
        })
        const rows = await manager.getBallotVotes(7n)
        expect(calls).toHaveLength(1)
        expect(calls[0].table).toBe('ballotpicks')
        expect(UInt64.from(calls[0].scope as never).equals(UInt64.from(7))).toBe(true)
        expect(rows).toEqual([{account: Name.from('eggmaple.gm'), picks: [2, 1]}])
    })

    it('getBuiltCharters scopes mandates by location and maps fields', async () => {
        const {manager, calls} = managerWith({
            mandates: [{node_id: 1, repeats: 2}],
        })
        const rows = await manager.getBuiltCharters(LOCATION)
        expect(calls[0].table).toBe('mandates')
        expect(UInt64.from(calls[0].scope as never).equals(coordsToLocationId(LOCATION))).toBe(true)
        expect(rows).toEqual([{nodeId: 1, repeats: 2}])
    })

    it('getBuildings scopes buildings by location and maps fields', async () => {
        const {manager, calls} = managerWith({
            buildings: [{entity_id: '9001', building: 3}],
        })
        const rows = await manager.getBuildings(LOCATION)
        expect(calls[0].table).toBe('buildings')
        expect(UInt64.from(calls[0].scope as never).equals(coordsToLocationId(LOCATION))).toBe(true)
        expect(rows).toEqual([{entityId: 9001n, building: 3}])
    })

    it('returns an empty array when the scope has no rows', async () => {
        const {manager} = managerWith({})
        expect(await manager.getBallotVotes(7n)).toEqual([])
        expect(await manager.getBuiltCharters(LOCATION)).toEqual([])
        expect(await manager.getBuildings(LOCATION)).toEqual([])
    })
})
