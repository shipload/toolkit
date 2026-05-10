import {describe, expect, test} from 'bun:test'
import type {EntitySnapshot} from '../../../src/lib/snapshot'
import {renderEntitySummary} from '../../../src/tui/primitives/entity-summary'
import {collectText} from '../render-tree'

function snap(): EntitySnapshot {
    return {
        type: 'ship',
        id: 1n,
        owner: 'alice',
        entity_name: 'Starter',
        coordinates: {x: -64, y: -10},
        cargomass: 2340,
        cargo: [],
        capacity: 3165,
        energy: 383,
        generator: {capacity: 383, recharge: 1},
        is_idle: false,
    } as never
}

describe('renderEntitySummary', () => {
    test('includes entity identity, freshness, coords, energy, cargo', () => {
        const node = renderEntitySummary({
            entityType: 'ship',
            entityId: 1n,
            snap: snap(),
            sinceLastFetch_s: 0,
            elapsed_s: 0,
        })
        const text = collectText(node).join(' ')
        expect(text).toContain('Ship "Starter"')
        expect(text).toContain('ship 1')
        expect(text).toContain('0s since fetch')
        expect(text).toContain('(-64, -10)')
        expect(text).toContain('383')
        expect(text).toContain('cargo')
    })
})
