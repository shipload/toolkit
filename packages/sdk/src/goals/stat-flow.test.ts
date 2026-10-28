import {describe, expect, test} from 'bun:test'
import {
    statFlow,
    statFlowByResource,
    statFlowPlates,
    statSlotLabel,
    type StatFlowSource,
} from './stat-flow'

const LIMPET_BAY_T2 = 11102
const LIMPET_BAY_T1 = 10102
const BEAM_T2 = 11005
const ORE_T1 = 101
const ORE_T2 = 102
const GAS_T2 = 302

function outline(sources: StatFlowSource[], depth = 0): string[] {
    return sources.flatMap((s) => [
        `${'  '.repeat(depth)}${s.itemId}:${s.label}:${Math.round(s.share * 100)}${s.fixed ? ':fixed' : ''}`,
        ...outline(s.sources, depth + 1),
    ])
}

describe('statFlow', () => {
    test('names a module attribute by its capability formula and traces it to resource stats', () => {
        const flow = statFlow(LIMPET_BAY_T2)
        expect(flow.map((a) => a.label)).toEqual(['Yield', 'Depth', 'Drain'])
        expect(outline(flow[0].sources)).toEqual([
            `${BEAM_T2}:Density:50`,
            `  ${ORE_T2}:Density:100`,
            `${LIMPET_BAY_T1}:Yield:50`,
            '  10005:Density:100',
            `    ${ORE_T1}:Density:100`,
        ])
    })

    test('a component slot held at the mean is marked fixed and has no resource beneath it', () => {
        const depth = statFlow(LIMPET_BAY_T2)[1]
        const fixed = depth.sources.find((s) => s.fixed)!
        expect(fixed).toMatchObject({
            itemId: BEAM_T2,
            label: 'Tolerance',
            sources: [],
        })
        expect(depth.fixed).toBe(false)
    })

    test('labels resource stats by category and unknown recipes trace to nothing', () => {
        expect(statSlotLabel(ORE_T2, 2)).toBe('Density')
        expect(statFlow(ORE_T2)).toEqual([])
    })
})

describe('statFlowByResource', () => {
    test('lists each resource stat with the parts it passes through and its share of each attribute', () => {
        const rows = statFlowByResource(LIMPET_BAY_T2).map(
            (r) =>
                `${r.itemId}:${r.stat} ` +
                r.feeds
                    .map(
                        (f) =>
                            `${f.path.map((p) => p.itemId).join('>')}>${f.attribute}:${Math.round(f.share * 100)}`
                    )
                    .join(' ')
        )
        expect(rows).toEqual([
            `${ORE_T2}:Density ${BEAM_T2}>Yield:50 ${BEAM_T2}>Depth:17`,
            `${ORE_T1}:Density 10005>${LIMPET_BAY_T1}>Yield:50 10005>${LIMPET_BAY_T1}>Depth:17`,
            `${GAS_T2}:Thermal 11009>Depth:17 11009>Drain:50`,
            `301:Thermal 10009>${LIMPET_BAY_T1}>Depth:17 10009>${LIMPET_BAY_T1}>Drain:50`,
        ])
    })
})

describe('statFlowPlates', () => {
    const rows = (itemId: number) =>
        statFlowPlates(itemId).map(
            (p) =>
                `${p.label}: ` +
                p.rows
                    .map(
                        (r) =>
                            `${r.kind}:${r.itemId}${r.kind === 'gather' ? `:${r.stat}:${r.through.join('>')}` : ''}:${Math.round(r.share * 100)}`
                    )
                    .join(' ')
        )

    test('expands only the goal own parts and stops at the item it upgrades from', () => {
        expect(rows(LIMPET_BAY_T2)).toEqual([
            `Yield: gather:${ORE_T2}:Density:${BEAM_T2}:50 upgrade:${LIMPET_BAY_T1}:50`,
            `Depth: gather:${ORE_T2}:Density:${BEAM_T2}:17 gather:${GAS_T2}:Thermal:11009:17 upgrade:${LIMPET_BAY_T1}:50 fixed:${BEAM_T2}:17`,
            `Drain: gather:${GAS_T2}:Thermal:11009:50 upgrade:${LIMPET_BAY_T1}:50`,
        ])
    })

    test('a hull upgrade keeps every row count small however long its lineage', () => {
        for (const plate of statFlowPlates(11214)) {
            expect(plate.rows.length).toBeLessThanOrEqual(3)
            expect(plate.rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1)
        }
    })
})
