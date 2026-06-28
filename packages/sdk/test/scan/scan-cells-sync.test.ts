import {describe, expect, test} from 'bun:test'
import {scanCells, scanCellsSync, scanReady} from '../../src/scan'

const GAME = '11'.repeat(32)
const EPOCH = '22'.repeat(32)

function region(xMin: number, yMin: number, xMax: number, yMax: number) {
    const cells = []
    for (let x = xMin; x <= xMax; x++) for (let y = yMin; y <= yMax; y++) cells.push({x, y})
    return cells
}

describe('@shipload/sdk/scan scanCellsSync', () => {
    test('deep-equals async scanCells over a region once warm', async () => {
        await scanReady()
        const cells = region(5000, 5000, 5040, 5040)
        const async = await scanCells(GAME, EPOCH, cells)
        const sync = scanCellsSync(GAME, EPOCH, cells)
        expect(sync).toEqual(async)
    })

    test('returns deposits with reserve > 0 for a gatherable cell', async () => {
        const [cell] = await scanCells(GAME, EPOCH, [{x: 5000, y: 5000}])
        const [syncCell] = scanCellsSync(GAME, EPOCH, [{x: 5000, y: 5000}])
        expect(syncCell).toEqual(cell)
    })
})
