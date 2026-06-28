import {describe, expect, test} from 'bun:test'
import {scanReady, getLocationType, systemsInBox, scanCells} from '../../src/scan'
import {
    getLocationType as jsLocType,
    deriveStrata,
    deriveLocationStatic,
    deriveLocationSize,
} from '../../src'

const GAME = '11'.repeat(32)

describe('@shipload/sdk/scan location API', () => {
    test('getLocationType parity with JS over a grid', async () => {
        await scanReady()
        for (let x = 5000; x < 5120; x++)
            for (let y = 5000; y < 5040; y++)
                expect(getLocationType(GAME, x, y)).toBe(Number(jsLocType(GAME, {x, y})))
    })
    test('systemsInBox parity with JS reference loop', async () => {
        await scanReady()
        const [xMin, yMin, xMax, yMax] = [5000, 5000, 5060, 5060]
        const ref: any[] = []
        for (let x = xMin; x <= xMax; x++)
            for (let y = yMin; y <= yMax; y++) {
                const t = Number(jsLocType(GAME, {x, y}))
                if (t !== 0) ref.push({x, y, locType: t})
            }
        expect(systemsInBox(GAME, xMin, yMin, xMax, yMax)).toEqual(ref)
    })
    test('sync call works without prior scanReady (self-instantiate)', async () => {
        expect(typeof getLocationType(GAME, 5000, 5000)).toBe('number')
    })
})

const EPOCH = '22'.repeat(32)

test('scanCells region parity with deriveStrata', async () => {
    const cells: {x: number; y: number}[] = []
    for (let x = 5000; x < 5008; x++) for (let y = 5000; y < 5008; y++) cells.push({x, y})
    const out = await scanCells(GAME, EPOCH, cells)
    out.forEach((cell, i) => {
        const ts = deriveStrata(cells[i], GAME, EPOCH)
        const loc = deriveLocationStatic(GAME, cells[i])
        expect(cell.location.locType).toBe(Number(loc.type))
        expect(cell.location.size).toBe(Number(loc.type) === 0 ? 0 : deriveLocationSize(loc))
        const deps = cell.deposits.slice().sort((a, b) => a.depth - b.depth)
        expect(deps.length).toBe(ts.length)
        ts.forEach((t, j) => {
            expect(deps[j].depth).toBe(t.index)
            expect(deps[j].itemId).toBe(t.itemId)
            expect(deps[j].richness).toBe(t.richness)
            expect(deps[j].reserve).toBe(t.reserve)
            expect(deps[j].stats).toEqual([t.stats.stat1, t.stats.stat2, t.stats.stat3])
        })
    })
})
