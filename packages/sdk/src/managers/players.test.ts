import {describe, expect, it} from 'bun:test'
import {Name} from '@wharfkit/antelope'
import {PlayersManager} from './players'

const companies = [
    {account: Name.from('alice'), name: 'Alice Co'},
    {account: Name.from('bob'), name: 'Bob Co'},
]

function managerWith(rows: typeof companies) {
    const reads: string[] = []
    const table = (contract: string) => (name: string) => {
        reads.push(`${contract}.${name}`)
        return {
            all: async () => rows,
            get: async (key: Name) => rows.find((r) => r.account.equals(key)),
        }
    }
    const ctx = {server: {table: table('server')}, platform: {table: table('platform')}} as never
    return {manager: new PlayersManager(ctx), reads}
}

describe('PlayersManager', () => {
    it('reads a player from its company row', async () => {
        const {manager, reads} = managerWith(companies)
        expect(String((await manager.getPlayer('bob'))?.owner)).toBe('bob')
        expect(await manager.getPlayer('carol')).toBeUndefined()
        expect(reads).toEqual(['platform.company', 'platform.company'])
    })

    it('lists every company owner as a player', async () => {
        const {manager} = managerWith(companies)
        expect((await manager.getPlayers()).map((p) => String(p.owner))).toEqual(['alice', 'bob'])
    })

    it('names each roster entry by its company', async () => {
        const {manager, reads} = managerWith(companies)
        const roster = await manager.getRoster()
        expect(roster.map((e) => [String(e.owner), e.company])).toEqual([
            ['alice', 'Alice Co'],
            ['bob', 'Bob Co'],
        ])
        expect(reads).toEqual(['platform.company'])
    })
})
