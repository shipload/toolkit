import {expect, test} from 'bun:test'
import {type LocationStratum, LocationType} from '@shipload/sdk'
import {renderDetail} from '../../../src/commands/query/stratum'
import {renderStrataTable} from '../../../src/lib/strata-render'

function stratum(
    index: number,
    itemId: number,
    reserve: number,
    richness: number,
    reserveMax = reserve
): LocationStratum {
    return {
        index,
        itemId,
        reserve,
        reserveMax,
        richness,
        seed: 0n,
        stats: {stat1: 0, stat2: 0, stat3: 0} as any,
    }
}

test('renderDetail still renders item, reserve, richness from raw stratum row', () => {
    const out = renderDetail(
        {item_id: 101, reserve: 1000, seed: 'abc', richness: 50} as any,
        null,
        0
    )
    expect(out).toContain('1000')
    expect(out).toContain('101')
})

test('renderStrataTable renders header and per-row non-empty strata', () => {
    const out = renderStrataTable({
        coords: {x: 10n, y: 20n},
        locationType: LocationType.ASTEROID,
        locationTypeLabel: 'Asteroid',
        size: 64,
        strata: [stratum(3, 101, 12000, 64), stratum(17, 201, 8400, 72)],
    })
    expect(out).toContain('(10, 20)')
    expect(out).toContain('Asteroid')
    expect(out).toContain('64 strata')
    expect(out).toContain('12000')
    expect(out).toContain('8400')
})

test('renderStrataTable empty when no non-empty strata', () => {
    const out = renderStrataTable({
        coords: {x: 0n, y: 0n},
        locationType: LocationType.EMPTY,
        locationTypeLabel: 'Empty',
        size: 0,
        strata: [],
    })
    expect(out.toLowerCase()).toContain('no non-empty strata')
})

const reachRows: LocationStratum[] = [
    stratum(42, 101, 15, 400),
    stratum(624, 501, 16, 410),
    stratum(705, 501, 45, 541),
]

test('renderStrataTable with reach hides out-of-depth rows by default', () => {
    const out = renderStrataTable({
        coords: {x: 0n, y: 0n},
        locationType: LocationType.PLANET,
        locationTypeLabel: 'Planet',
        size: 3618,
        strata: reachRows,
        reach: {depth: 100},
    })
    const lines = out.split('\n')
    expect(lines.some((l) => /^\s*42\s/.test(l))).toBe(true)
    expect(lines.some((l) => /^\s*624\s/.test(l))).toBe(false)
    expect(lines.some((l) => /^\s*705\s/.test(l))).toBe(false)
    expect(out).toContain('1 reachable of 3 · gatherer depth 100')
})

test('renderStrataTable with reach + showAll marks unreachable rows with OOD', () => {
    const out = renderStrataTable({
        coords: {x: 0n, y: 0n},
        locationType: LocationType.PLANET,
        locationTypeLabel: 'Planet',
        size: 3618,
        strata: reachRows,
        reach: {depth: 100},
        showAll: true,
    })
    const lines = out.split('\n')
    const row42 = lines.find((l) => /^\s*42\s/.test(l))
    const row624 = lines.find((l) => /^\s*624\s/.test(l))
    const row705 = lines.find((l) => /^\s*705\s/.test(l))
    expect(row42).toBeDefined()
    expect(row624).toBeDefined()
    expect(row705).toBeDefined()
    expect(row42).not.toContain('OOD')
    expect(row624).toContain('OOD')
    expect(row705).toContain('OOD')
    expect(out).toContain('1 reachable of 3 · gatherer depth 100')
})

test('renderStrataTable without reach parameter shows all rows and no reach summary', () => {
    const out = renderStrataTable({
        coords: {x: 0n, y: 0n},
        locationType: LocationType.PLANET,
        locationTypeLabel: 'Planet',
        size: 3618,
        strata: reachRows,
    })
    const lines = out.split('\n')
    expect(lines.some((l) => /^\s*42\s/.test(l))).toBe(true)
    expect(lines.some((l) => /^\s*624\s/.test(l))).toBe(true)
    expect(lines.some((l) => /^\s*705\s/.test(l))).toBe(true)
    expect(out).not.toContain('OOD')
    expect(out).not.toContain('reachable')
})
