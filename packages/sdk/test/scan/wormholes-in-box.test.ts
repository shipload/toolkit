import {describe, expect, test} from 'bun:test'
import {Bytes, Checksum256} from '@wharfkit/antelope'
import {scanReady, wormholesInBox} from '../../src/scan'
import {WH, wormholeAtRegionEndpoint} from '../../src'

const SEED = Checksum256.hash(Bytes.from('test-game-seed', 'utf8'))
const GAME = SEED.toString()

interface WhCell {
    x: number
    y: number
    exit: {x: number; y: number}
}

function jsOracle(xMin: number, yMin: number, xMax: number, yMax: number): WhCell[] {
    const out: WhCell[] = []
    const rxMin = Math.floor(xMin / WH.RSIZE)
    const rxMax = Math.floor(xMax / WH.RSIZE)
    const ryMin = Math.floor(yMin / WH.RSIZE)
    const ryMax = Math.floor(yMax / WH.RSIZE)
    for (let rx = rxMin; rx <= rxMax; rx++)
        for (let ry = ryMin; ry <= ryMax; ry++) {
            const pair = wormholeAtRegionEndpoint(SEED, rx, ry)
            if (!pair) continue
            out.push({x: pair.from.x, y: pair.from.y, exit: pair.to})
        }
    return out
}

function findWormholeOrigin(): {x: number; y: number} | null {
    for (let rx = 0; rx <= 40; rx++)
        for (let ry = 0; ry <= 40; ry++) {
            const pair = wormholeAtRegionEndpoint(SEED, rx, ry)
            if (pair) return pair.from
        }
    return null
}

describe('@shipload/sdk/scan wormholesInBox', () => {
    test('parity with JS oracle over a region containing a wormhole', async () => {
        await scanReady()
        const origin = findWormholeOrigin()
        expect(origin).not.toBeNull()
        const xMin = origin!.x - 200
        const yMin = origin!.y - 200
        const xMax = origin!.x + 200
        const yMax = origin!.y + 200
        const ref = jsOracle(xMin, yMin, xMax, yMax)
        expect(ref.length).toBeGreaterThan(0)
        expect(wormholesInBox(GAME, xMin, yMin, xMax, yMax)).toEqual(ref)
    })

    test('agrees with JS oracle at the coordinate-space edge (bounds path)', async () => {
        await scanReady()
        const max = 2_147_483_647
        const xMin = max - 300
        const yMin = max - 300
        expect(wormholesInBox(GAME, xMin, yMin, max, max)).toEqual(jsOracle(xMin, yMin, max, max))
    })
})
