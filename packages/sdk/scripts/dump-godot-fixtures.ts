import {mkdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {encodeAddress} from '../src/coordinates/address'
import {SECTOR_ADJECTIVES, SECTOR_NOUNS} from '../src/coordinates/sectors'
import {deriveLocationStatic, getLocationKind, getSystemName} from '../src/utils/system'
import {deriveLocationSize} from '../src/derivation/location-size'
import {wormholeAt} from '../src/derivation/wormhole'
import {getInterpolatedPosition} from '../src/travel/travel'
import {currentTaskIndexForLane, currentTaskProgressFloatForLane} from '../src/scheduling/lane-core'
import {ServerContract} from '../src/contracts'

const GAME_SEED = '0be1140ada53742f96d665c114fa693bd1512f886b6949b08b570fd70b764e83'
const OUT_DIR = process.argv[2]
if (!OUT_DIR) {
    console.error('usage: bun scripts/dump-godot-fixtures.ts <output-dir>')
    process.exit(1)
}

const KIND_NAMES: Record<number, string> = {
    1: 'planet',
    2: 'asteroid',
    3: 'nebula',
    4: 'ice_field',
}

interface LocationCase {
    x: number
    y: number
    kind: string
    subtype: number
    size: number
    name: string
    exit_x?: number
    exit_y?: number
}

function scanBox(minX: number, minY: number, maxX: number, maxY: number): LocationCase[] {
    const out: LocationCase[] = []
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const kind = getLocationKind(GAME_SEED, x, y)
            if (kind === 'empty') continue
            if (kind === 'wormhole') {
                const exit = wormholeAt(GAME_SEED, x, y)!
                out.push({
                    x,
                    y,
                    kind,
                    subtype: 0,
                    size: 0,
                    name: '',
                    exit_x: exit.x,
                    exit_y: exit.y,
                })
                continue
            }
            const loc = deriveLocationStatic(GAME_SEED, {x, y})
            out.push({
                x,
                y,
                kind: KIND_NAMES[loc.type.toNumber()],
                subtype: loc.subtype.toNumber(),
                size: deriveLocationSize(loc),
                name: getSystemName(GAME_SEED, {x, y}),
            })
        }
    }
    return out
}

const boxes = [
    {name: 'origin', min_x: 0, min_y: 0, max_x: 63, max_y: 63},
    {name: 'negative', min_x: -64, min_y: -64, max_x: -1, max_y: -1},
    {name: 'wormhole-region', min_x: 0, min_y: 1470, max_x: 74, max_y: 1544},
].map((b) => ({...b, expected: scanBox(b.min_x, b.min_y, b.max_x, b.max_y)}))

const wormholeBoxHasWormhole = boxes[2].expected.some(
    (e) => e.kind === 'wormhole' && e.x === 37 && e.y === 1503
)
if (!wormholeBoxHasWormhole) {
    throw new Error('sanity: expected wormhole at (37,1503) missing from wormhole-region box')
}

function travelEntity(coordinates: {x: number; y: number}, started: string, tasks: object[]) {
    return {
        coordinates,
        lanes: [{lane_key: 0, schedule: {started, tasks}}],
    }
}

const T0 = '2026-01-01T00:00:00.000'
const T0_MS = Date.parse(`${T0}Z`)
const travel = (duration: number, x: number, y: number) => ({
    type: 1,
    duration,
    cancelable: 1,
    coordinates: {x, y},
    cargo: [],
    couplings: [],
    energy_cost: 0,
})
const recharge = (duration: number) => ({
    type: 2,
    duration,
    cancelable: 1,
    cargo: [],
    couplings: [],
    energy_cost: 0,
})

const singleLeg = travelEntity({x: 1, y: 3}, T0, [travel(483, 4000, 3000)])
const multiLeg = travelEntity({x: 0, y: 0}, T0, [
    travel(100, 1000, 0),
    recharge(50),
    travel(200, 1000, 2000),
])
const transitLeg = travelEntity({x: 500, y: 500}, T0, [
    {
        type: 9,
        duration: 60,
        cancelable: 0,
        coordinates: {x: 900, y: 500},
        cargo: [],
        couplings: [],
        energy_cost: 0,
    },
])

function expectedAt(entityDef: ReturnType<typeof travelEntity>, nowMs: number) {
    const lane = ServerContract.Types.lane.from(entityDef.lanes[0])
    const now = new Date(nowMs)
    const idx = currentTaskIndexForLane(lane.schedule, now)
    const progress = currentTaskProgressFloatForLane(lane.schedule, now)
    const entity = {
        coordinates: ServerContract.Types.coordinates.from(entityDef.coordinates),
        lanes: [lane],
    }
    return getInterpolatedPosition(entity as never, idx, progress)
}

const travelCases = [
    {name: 'single-pre-start', entity: singleLeg, now_ms: T0_MS - 10_000},
    {name: 'single-start', entity: singleLeg, now_ms: T0_MS},
    {name: 'single-quarter', entity: singleLeg, now_ms: T0_MS + 120_750},
    {name: 'single-midpoint', entity: singleLeg, now_ms: T0_MS + 241_500},
    {name: 'single-late', entity: singleLeg, now_ms: T0_MS + 400_000},
    {name: 'single-settled', entity: singleLeg, now_ms: T0_MS + 600_000},
    {name: 'multi-first-leg', entity: multiLeg, now_ms: T0_MS + 50_000},
    {name: 'multi-recharge-holds-origin', entity: multiLeg, now_ms: T0_MS + 125_000},
    {name: 'multi-second-leg', entity: multiLeg, now_ms: T0_MS + 250_000},
    {name: 'multi-settled', entity: multiLeg, now_ms: T0_MS + 400_000},
    {name: 'transit-mid', entity: transitLeg, now_ms: T0_MS + 30_000},
].map((c) => ({...c, expected: expectedAt(c.entity, c.now_ms)}))

mkdirSync(resolve(OUT_DIR, 'native/tests/fixtures'), {recursive: true})
mkdirSync(resolve(OUT_DIR, 'tests/fixtures'), {recursive: true})
writeFileSync(
    resolve(OUT_DIR, 'native/tests/fixtures/locations-cases.json'),
    JSON.stringify({game_seed: GAME_SEED, boxes}, null, 2)
)
writeFileSync(
    resolve(OUT_DIR, 'tests/fixtures/travel-cases.json'),
    JSON.stringify({cases: travelCases}, null, 2)
)

interface AddressCase {
    x: number
    y: number
    sector: string
    region: string
    local_x: number
    local_y: number
}

const ADDRESS_COORDS: Array<[number, number]> = [
    [0, 0],
    [1, 1],
    [-1, -1],
    [12, -9],
    [4999, 4999],
    [5000, 5000],
    [-5000, -5000],
    [-5001, -5001],
    [10_000, -10_000],
    [123_456_789, -987_654_321],
    [2_147_483_647, -2_147_483_648],
    [-2_147_483_648, 2_147_483_647],
]

const addressCases: AddressCase[] = ADDRESS_COORDS.map(([x, y]) => {
    const a = encodeAddress(GAME_SEED, x, y)
    return {x, y, sector: a.sector, region: a.region, local_x: a.localX, local_y: a.localY}
})

mkdirSync(resolve(OUT_DIR, 'native/src/data'), {recursive: true})
writeFileSync(
    resolve(OUT_DIR, 'native/tests/fixtures/addresses-cases.json'),
    `${JSON.stringify({game_seed: GAME_SEED, cases: addressCases}, null, 2)}\n`
)
writeFileSync(
    resolve(OUT_DIR, 'native/src/data/sector-adjectives.json'),
    `${JSON.stringify(SECTOR_ADJECTIVES, null, 2)}\n`
)
writeFileSync(
    resolve(OUT_DIR, 'native/src/data/sector-nouns.json'),
    `${JSON.stringify(SECTOR_NOUNS, null, 2)}\n`
)
console.log(
    `addresses: ${addressCases.length} cases, ` +
        `${SECTOR_ADJECTIVES.length} adjectives, ${SECTOR_NOUNS.length} nouns`
)

console.log('wrote fixtures to', OUT_DIR)
