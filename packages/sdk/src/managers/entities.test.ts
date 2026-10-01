import {describe, expect, it} from 'bun:test'
import {UInt64} from '@wharfkit/antelope'
import {EntitiesManager} from './entities'

function managerWith(getImpl: (key: unknown) => Promise<unknown>) {
    const table = () => ({get: getImpl})
    const ctx = {server: {table}} as never
    return new EntitiesManager(ctx)
}

describe('EntitiesManager.getHullStats', () => {
    it('reads the encoded stats off the raw entity row', async () => {
        const m = managerWith(async () => ({stats: UInt64.from('123456789')}))
        const stats = await m.getHullStats(23)
        expect(stats.equals(UInt64.from('123456789'))).toBe(true)
    })

    it('returns zero when the chain has no row for the id', async () => {
        const m = managerWith(async () => undefined)
        const stats = await m.getHullStats(23)
        expect(stats.equals(UInt64.from(0))).toBe(true)
    })
})
