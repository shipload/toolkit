import {describe, expect, test} from 'bun:test'
import {
    deriveLocationSize,
    deriveLocationStatic,
    deriveResourceStats,
    deriveStratum,
    getItem,
    LocationType,
} from '@shipload/sdk'
import {type DerivedCell, scanCells} from '@shipload/sdk/scan'
import {Checksum256} from '@wharfkit/antelope'
import {Histogram} from './histogram'
import {ingestDerivedCells, resolveItemName, type ScanAccumulators} from './ingest'
import {MultiHigh} from './multi-high'
import {TopN} from './top-n'
import type {LeaderboardEntry} from './types'

const GAME = '11'.repeat(32)
const EPOCH = '22'.repeat(32)
const THRESHOLD = 900
const TOP_N = 25

function newAcc(): ScanAccumulators {
    return {
        histogram: new Histogram(),
        multiHigh: new MultiHigh(THRESHOLD),
        leaderboard: new TopN(TOP_N),
        locationCounts: {planets: 0, asteroids: 0, nebulas: 0, iceFields: 0},
    }
}

function snapshot(acc: ScanAccumulators) {
    return {
        histogram: acc.histogram.snapshot(),
        multiHigh: acc.multiHigh.snapshot(),
        leaderboard: acc.leaderboard.snapshot(),
        locationCounts: acc.locationCounts,
    }
}

// The pre-WASM JS reference path the worker / single-threaded fallback used.
function ingestViaJs(cells: Array<{x: number; y: number}>): {
    snapshot: ReturnType<typeof snapshot>
    strata: number
    locations: number
} {
    const gameSeed = Checksum256.from(GAME)
    const epochSeed = Checksum256.from(EPOCH)
    const acc = newAcc()
    let strata = 0
    let locations = 0

    for (const coord of cells) {
        const loc = deriveLocationStatic(gameSeed, coord)
        const locType = loc.type.toNumber() as LocationType
        if (locType === LocationType.EMPTY) continue

        switch (locType) {
            case LocationType.PLANET:
                acc.locationCounts.planets++
                break
            case LocationType.ASTEROID:
                acc.locationCounts.asteroids++
                break
            case LocationType.NEBULA:
                acc.locationCounts.nebulas++
                break
            case LocationType.ICE_FIELD:
                acc.locationCounts.iceFields++
                break
        }
        locations++

        const size = deriveLocationSize(loc)
        if (size === 0) continue
        const subtype = loc.subtype.toNumber()

        for (let stratum = 0; stratum < size; stratum++) {
            const s = deriveStratum(epochSeed, coord, stratum, locType, subtype, size)
            if (s.reserve === 0) continue
            const stats = deriveResourceStats(s.seed)
            strata++
            acc.histogram.ingest(stats)
            acc.multiHigh.ingest(stats)
            const itemName = (() => {
                try {
                    return getItem(s.itemId).name
                } catch {
                    return `#${s.itemId}`
                }
            })()
            const entry: LeaderboardEntry = {
                coord,
                locType,
                subtype,
                itemId: s.itemId,
                itemName,
                stratum,
                richness: s.richness,
                reserve: s.reserve,
                stats,
            }
            acc.leaderboard.ingest(entry)
        }
    }

    return {snapshot: snapshot(acc), strata, locations}
}

function region(xMin: number, yMin: number, xMax: number, yMax: number) {
    const cells: Array<{x: number; y: number}> = []
    for (let x = xMin; x <= xMax; x++) for (let y = yMin; y <= yMax; y++) cells.push({x, y})
    return cells
}

describe('ingestDerivedCells parity with JS deriveStratum loop', () => {
    test('WASM scanCells + ingest deep-equals the JS-derive loop over a region', async () => {
        const cells = region(-40, -40, -24, -24)
        const js = ingestViaJs(cells)

        const counts = js.snapshot.locationCounts
        const distinctTypes = [
            counts.planets,
            counts.asteroids,
            counts.nebulas,
            counts.iceFields,
        ].filter((n) => n > 0).length
        expect(distinctTypes).toBe(4)
        expect(js.strata).toBeGreaterThan(0)
        expect(js.snapshot.leaderboard.length).toBe(TOP_N)
        // Region has far more cells than locations → empties are present.
        expect(js.locations).toBeLessThan(cells.length)

        const derived = await scanCells(GAME, EPOCH, cells)
        const acc = newAcc()
        const got = ingestDerivedCells(derived, acc, resolveItemName)

        expect(snapshot(acc)).toEqual(js.snapshot)
        expect(got.strata).toBe(js.strata)
        expect(got.locations).toBe(js.locations)
    }, 60000)
})

describe('ingestDerivedCells branch coverage on synthetic cells', () => {
    test('counts size-0 and ICE_FIELD locations, skips empties, ingests deposits', () => {
        const cells: DerivedCell[] = [
            // Empty: skipped entirely.
            {location: {x: 0, y: 0, locType: LocationType.EMPTY, subtype: 0, size: 0}, deposits: []},
            // Non-empty but size 0 / no deposits: counted, contributes no strata.
            {
                location: {x: 1, y: 0, locType: LocationType.PLANET, subtype: 2, size: 0},
                deposits: [],
            },
            // ICE_FIELD with one deposit.
            {
                location: {x: 2, y: 0, locType: LocationType.ICE_FIELD, subtype: 7, size: 600},
                deposits: [
                    {
                        x: 2,
                        y: 0,
                        depth: 3,
                        itemId: 999999,
                        richness: 500,
                        reserve: 12.5,
                        stats: [950, 100, 200],
                    },
                ],
            },
        ]

        const acc = newAcc()
        const got = ingestDerivedCells(cells, acc, resolveItemName)

        expect(acc.locationCounts).toEqual({planets: 1, asteroids: 0, nebulas: 0, iceFields: 1})
        expect(got.locations).toBe(2)
        expect(got.strata).toBe(1)

        const board = acc.leaderboard.snapshot()
        expect(board.length).toBe(1)
        expect(board[0]).toEqual({
            coord: {x: 2, y: 0},
            locType: LocationType.ICE_FIELD,
            subtype: 7,
            itemId: 999999,
            itemName: '#999999',
            stratum: 3,
            richness: 500,
            reserve: 12.5,
            stats: {stat1: 950, stat2: 100, stat3: 200},
        })
        expect(acc.histogram.snapshot().totalSamples).toBe(1)
    })
})
