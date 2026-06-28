import {afterAll, beforeAll, describe, expect, test} from 'bun:test'
import {Bytes, Checksum256} from '@wharfkit/antelope'
import {getLocationType, scanReady, systemsInBox} from '../../src/scan'
import {planRoute, sdkSystemGraph, setScanProvider} from '../../src/travel/route-planner'

const SEED = Checksum256.hash(Bytes.from('test-game-seed', 'utf8'))

function jsGraph() {
    setScanProvider(null)
    return sdkSystemGraph(SEED)
}
function wasmGraph() {
    setScanProvider({getLocationType, systemsInBox})
    return sdkSystemGraph(SEED)
}

beforeAll(async () => {
    await scanReady()
})
afterAll(() => {
    setScanProvider(null)
})

describe('wasm system graph parity', () => {
    test('hasSystem agrees with the JS path across a region', () => {
        const js = jsGraph()
        const wasm = wasmGraph()
        for (let x = -40; x <= 40; x += 3) {
            for (let y = 280; y <= 320; y += 3) {
                expect(wasm.hasSystem({x, y})).toBe(js.hasSystem({x, y}))
            }
        }
    })

    test('nearby returns the same neighbor set as the JS path', () => {
        const js = jsGraph()
        const wasm = wasmGraph()
        const key = (ns: {coord: {x: number; y: number}}[]) =>
            ns
                .map((n) => `${n.coord.x},${n.coord.y}`)
                .sort()
                .join('|')
        for (const c of [
            {x: 0, y: 300},
            {x: 12, y: 295},
            {x: -25, y: 312},
        ]) {
            for (const reach of [6, 10.5, 16]) {
                expect(key(wasm.nearby(c, reach))).toBe(key(js.nearby(c, reach)))
            }
        }
    })

    test('planRoute yields an identical result on either backend', () => {
        const params = {origin: {x: 12, y: 295}, perLegReach: 12, maxLegs: 40, corridorSlack: 36}
        const dest = {x: 40, y: 312}
        setScanProvider(null)
        const js = planRoute({...params, dest, graph: sdkSystemGraph(SEED)})
        setScanProvider({getLocationType, systemsInBox})
        const wasm = planRoute({...params, dest, graph: sdkSystemGraph(SEED)})
        expect(JSON.stringify(wasm)).toBe(JSON.stringify(js))
    })
})
