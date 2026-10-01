import {expect, test} from 'bun:test'
import {ServerContract} from '@shipload/sdk'
import {Name, UInt16, UInt64} from '@wharfkit/antelope'
import {resolveShuttleCandidatePool} from '../../src/lib/shuttle-candidates'
import {getLocalShipload} from '../helpers/shipload'

const site = {x: 10, y: 20}

function row(over: {
    id: number
    owner: string
    kind: string
    modules?: unknown[]
}): ServerContract.Types.entity_row {
    return {
        id: UInt64.from(over.id),
        owner: Name.from(over.owner),
        kind: Name.from(over.kind),
        item_id: UInt16.from(1),
        coordinates: site,
        modules: over.modules ?? [],
        lanes: [],
    } as never
}

function entityInfo(over: {id: number; owner: string; modules?: unknown[]}): ServerContract.Types.entity_info {
    return {
        id: UInt64.from(over.id),
        owner: Name.from(over.owner),
        type: Name.from('ship'),
        coordinates: site,
        item_id: UInt16.from(1),
        modules: over.modules ?? [],
        lanes: [],
    } as never
}

test('resolveShuttleCandidatePool fetches the building and any explicit candidates, but owned ships from one getEntities call', async () => {
    const sl = getLocalShipload()
    const rows = new Map<string, ServerContract.Types.entity_row>()
    rows.set('1001', row({id: 1001, owner: 'eon.shipload', kind: 'workshop'}))
    rows.set('900', row({id: 900, owner: 'eon.shipload', kind: 'depot'}))
    let fetchRowCalls = 0
    const fetchRow = async (id: bigint | number) => {
        fetchRowCalls++
        const r = rows.get(String(id))
        if (!r) throw new Error(`unexpected fetchRow(${id})`)
        return r
    }
    const loaderModule = {installed: {item_id: 10103, stats: 0}} as never
    const owned = [entityInfo({id: 5001, owner: 'eggmaple.gm', modules: [loaderModule]})]
    sl.entities.getEntities = (async () => owned) as typeof sl.entities.getEntities
    sl.influence.getCivicOwner = (async () =>
        Name.from('eon.shipload')) as typeof sl.influence.getCivicOwner

    const pool = await resolveShuttleCandidatePool(sl, 1001n, 1003n, [900n], 'eggmaple.gm', fetchRow)

    expect(fetchRowCalls).toBe(2)
    expect(pool.map(String).sort()).toEqual(['5001', '900'])
})
