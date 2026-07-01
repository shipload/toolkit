import {describe, expect, test} from 'bun:test'
import {formatClusterGrid, glyphForLabel} from '../../src/lib/cluster-grid'

describe('glyphForLabel', () => {
    test('single-word label -> first two letters, first capitalised', () => {
        expect(glyphForLabel('Warehouse')).toBe('Wa')
        expect(glyphForLabel('Factory')).toBe('Fa')
    })
    test('multi-word label -> uppercased word initials', () => {
        expect(glyphForLabel('Mining Rig')).toBe('MR')
        expect(glyphForLabel('Mass Driver')).toBe('MD')
        expect(glyphForLabel('Mass Catcher')).toBe('MC')
    })
})

const FOOTPRINT = [
    {gx: 0, gy: -2}, {gx: -1, gy: -1}, {gx: 0, gy: -1}, {gx: 1, gy: -1},
    {gx: -2, gy: 0}, {gx: -1, gy: 0}, {gx: 1, gy: 0}, {gx: 2, gy: 0},
    {gx: -1, gy: 1}, {gx: 0, gy: 1}, {gx: 1, gy: 1}, {gx: 0, gy: 2},
]

function render() {
    return formatClusterGrid({
        hub: {id: 5, label: 'Station Hub', x: 120, y: -8},
        footprint: FOOTPRINT,
        occupants: [
            {gx: 0, gy: -1, entityId: 51, label: 'Mining Rig'},
            {gx: 0, gy: 1, entityId: 62, label: 'Factory'},
        ],
    })
}

describe('formatClusterGrid', () => {
    test('header reports counts', () => {
        expect(render()).toContain('Footprint 12 cells · 2 occupied · 10 free')
    })
    test('legend lists hub and occupants by current label and id', () => {
        const out = render()
        expect(out).toContain('(H) Station Hub#5')
        expect(out).toContain('MR Mining Rig#51')
        expect(out).toContain('Fa Factory#62')
    })
    test('free-cell list excludes occupied cells', () => {
        const out = render()
        const line = out.split('\n').find((l) => l.startsWith('  free:'))
        expect(line).toBeDefined()
        expect(line).toContain('(0,-2)')
        expect(line).not.toContain('(0,-1)')
        expect(line).not.toContain('(0,1)')
    })
    test('occupant glyphs land on their gy row', () => {
        const lines = render().split('\n')
        const rowFor = (gy: number) => lines.find((l) => l.trimStart().startsWith(`${gy} `))
        expect(rowFor(-1)).toContain('MR')
        expect(rowFor(1)).toContain('Fa')
    })
})
