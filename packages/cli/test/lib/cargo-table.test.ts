import {describe, expect, test} from 'bun:test'
import {formatCargoTable} from '../../src/lib/cargo-table'
import {stackKey, type StackDelta, type StackKey} from '../../src/lib/cargo-projection'

function row(itemId: number, quantity: number, stats: bigint, id: bigint | undefined = undefined) {
    return {
        item_id: itemId,
        quantity,
        stats,
        modules: [],
        ...(id !== undefined ? {id} : {}),
    } as any
}

describe('formatCargoTable rowId column', () => {
    test('renders Row ID header when rowId is in columns', () => {
        const out = formatCargoTable([row(301, 5, 0n, 7n)], {columns: ['rowId', 'item', 'itemId']})
        expect(out).toContain('Row ID')
    })

    test('renders the numeric id when present', () => {
        const out = formatCargoTable([row(301, 5, 0n, 42n)], {columns: ['rowId', 'item']})
        expect(out).toContain('42')
    })

    test('renders — when id is missing or 0 (projected-only)', () => {
        const a = formatCargoTable([row(301, 5, 0n, 0n)], {columns: ['rowId', 'item']})
        const b = formatCargoTable([row(301, 5, 0n, undefined)], {columns: ['rowId', 'item']})
        expect(a).toContain('—')
        expect(b).toContain('—')
    })
})

describe('formatCargoTable deltas', () => {
    test('omitted deltas option leaves qty unchanged', () => {
        const out = formatCargoTable([row(301, 73, 0n, 1n)], {columns: ['qty', 'item']})
        expect(out).toContain('73')
        expect(out).not.toContain('(+')
        expect(out).not.toContain('(-')
        expect(out).not.toContain('(new)')
    })

    test('empty deltas map leaves qty unchanged', () => {
        const deltas = new Map<StackKey, StackDelta>()
        const out = formatCargoTable([row(301, 73, 0n, 1n)], {columns: ['qty', 'item'], deltas})
        expect(out).toContain('73')
        expect(out).not.toContain('(+')
        expect(out).not.toContain('(-')
    })

    test('add delta renders as "5 (+2)"', () => {
        const deltas = new Map<StackKey, StackDelta>()
        deltas.set(stackKey(301n, 0n, []), {kind: 'add', quantity: 2n})
        const out = formatCargoTable([row(301, 5, 0n, 1n)], {columns: ['qty', 'item'], deltas})
        expect(out).toContain('5 (+2)')
    })

    test('remove delta renders as "72 (-1)"', () => {
        const deltas = new Map<StackKey, StackDelta>()
        deltas.set(stackKey(301n, 0n, []), {kind: 'remove', quantity: 1n})
        const out = formatCargoTable([row(301, 72, 0n, 1n)], {columns: ['qty', 'item'], deltas})
        expect(out).toContain('72 (-1)')
    })

    test('new delta renders as "(new) 5"', () => {
        const deltas = new Map<StackKey, StackDelta>()
        deltas.set(stackKey(301n, 0n, []), {kind: 'new', quantity: 5n})
        const out = formatCargoTable([row(301, 5, 0n, 0n)], {columns: ['qty', 'item'], deltas})
        expect(out).toContain('(new) 5')
    })

    test('row without matching delta key keeps qty unchanged', () => {
        const deltas = new Map<StackKey, StackDelta>()
        deltas.set(stackKey(999n, 0n, []), {kind: 'add', quantity: 2n})
        const out = formatCargoTable([row(301, 73, 0n, 1n)], {columns: ['qty', 'item'], deltas})
        expect(out).toContain('73')
        expect(out).not.toContain('(+')
    })

    test('mix: one row with delta, one without', () => {
        const deltas = new Map<StackKey, StackDelta>()
        deltas.set(stackKey(301n, 0n, []), {kind: 'add', quantity: 2n})
        const out = formatCargoTable(
            [row(301, 5, 0n, 1n), row(302, 10, 0n, 2n)],
            {columns: ['qty', 'item'], deltas},
        )
        expect(out).toContain('5 (+2)')
        expect(out).toContain('10')
        const lines = out.split('\n')
        const row302Line = lines.find((l) => l.includes('10'))
        expect(row302Line).toBeDefined()
        expect(row302Line!).not.toContain('(+')
        expect(row302Line!).not.toContain('(-')
    })
})
