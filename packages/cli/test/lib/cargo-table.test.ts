import {describe, expect, test} from 'bun:test'
import {formatCargoTable} from '../../src/lib/cargo-table'

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
