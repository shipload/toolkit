import {expect, test} from 'bun:test'
import {
    buildCensus,
    buildSummary,
    coordKey,
    renderCensusGroups,
    renderSummary,
    type CensusInputRow,
} from './census'

const ROWS: CensusInputRow[] = [
    {owner: 'agent.gm', kind: 'extractor', x: -64, y: -10},
    {owner: 'agent.gm', kind: 'extractor', x: -64, y: -10},
    {owner: 'agent.gm', kind: 'factory', x: -64, y: -10},
    {owner: 'agent.gm', kind: 'ship', x: 5, y: 5},
    {owner: 'wcgockxte.gm', kind: 'warehouse', x: -27, y: 5},
    {owner: 'wcgockxte.gm', kind: 'warehouse', x: -27, y: 7},
]

test('coordKey omits z when absent and includes it when present', () => {
    expect(coordKey({x: -64, y: -10})).toBe('-64,-10')
    expect(coordKey({x: -64, y: -10, z: 3})).toBe('-64,-10,3')
    expect(coordKey({x: 0, y: 0, z: 0})).toBe('0,0,0')
})

test('buildCensus by owner totals each account and breaks down by kind', () => {
    const groups = buildCensus(ROWS, 'owner')
    const agent = groups.find((g) => g.key === 'agent.gm')
    expect(agent?.total).toBe(4)
    expect(agent?.byKind).toEqual({extractor: 2, factory: 1, ship: 1})
    const wc = groups.find((g) => g.key === 'wcgockxte.gm')
    expect(wc?.total).toBe(2)
})

test('buildCensus by coord matches the per-coordinate migration view', () => {
    const groups = buildCensus(ROWS, 'coord')
    const hub = groups.find((g) => g.key === '-64,-10')
    expect(hub?.total).toBe(3)
    expect(hub?.byKind).toEqual({extractor: 2, factory: 1})
    expect(groups.find((g) => g.key === '-27,5')?.total).toBe(1)
    expect(groups.find((g) => g.key === '-27,7')?.total).toBe(1)
})

test('buildCensus sorts by total descending then key ascending', () => {
    const groups = buildCensus(ROWS, 'coord')
    expect(groups[0]?.key).toBe('-64,-10')
    expect(groups[0]?.total).toBe(3)
})

test('buildSummary counts distinct owners, coordinates, and per-kind totals', () => {
    const summary = buildSummary(ROWS)
    expect(summary.totalEntities).toBe(6)
    expect(summary.owners).toBe(2)
    expect(summary.coordinates).toBe(4)
    expect(summary.byKind).toEqual({extractor: 2, factory: 1, ship: 1, warehouse: 2})
})

test('renderCensusGroups shows coordinate, total, and kind breakdown', () => {
    const out = renderCensusGroups(buildCensus(ROWS, 'coord'), 'coord', ROWS.length)
    const hubLine = out.split('\n').find((l) => l.includes('-64,-10'))
    expect(hubLine).toContain('3')
    expect(hubLine).toContain('extractor 2')
    expect(hubLine).toContain('factory 1')
})

test('renderSummary reports totals and per-kind counts', () => {
    const out = renderSummary(buildSummary(ROWS))
    expect(out).toContain('6 entities across 2 owners at 4 coordinates')
    const warehouseLine = out.split('\n').find((l) => l.includes('warehouse'))
    expect(warehouseLine).toContain('2')
})
