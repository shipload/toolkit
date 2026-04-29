import {describe, expect, test} from 'bun:test'
import {render, SUBCOMMAND, SUBCOMMAND_CARGO_ALIAS} from '../../../src/commands/query/inventory'

function row(itemId: number, quantity: number, stats: bigint, id: bigint | undefined = undefined) {
    return {
        item_id: itemId,
        quantity,
        stats,
        modules: [],
        ...(id !== undefined ? {id} : {}),
    } as any
}

describe('inventory.render', () => {
    test('empty cargo prints empty marker', () => {
        const out = render('ship', 1n, [])
        expect(out).toContain('Inventory for ship 1')
        expect(out.toLowerCase()).toContain('empty')
    })

    test('non-empty cargo includes a Row ID column', () => {
        const out = render('ship', 1n, [row(301, 32, 214202522n, 7n), row(201, 5, 999n, 11n)])
        expect(out).toContain('Row ID')
        expect(out).toContain('Item ID')
        expect(out).toContain('Stack ID')
        expect(out).toContain('Qty')
        expect(out).toContain('301')
        expect(out).toContain('201')
        expect(out).toContain('7')
        expect(out).toContain('11')
    })

    test('projected-only stacks (no row id) render —', () => {
        const out = render('ship', 1n, [row(301, 1, 0n, 0n)])
        expect(out).toContain('—')
    })

    test('rows sort by item-id ascending then row-id ascending; projected-only last within an item-id', () => {
        const out = render('ship', 1n, [
            row(501, 1, 0n, 9n),
            row(301, 1, 0n, 5n),
            row(101, 1, 0n, 0n),
            row(101, 1, 1n, 3n),
            row(101, 1, 2n, 2n),
        ])
        const lines = out.split('\n')
        const idxRow2 = lines.findIndex((l) => /\b2\b/.test(l) && l.includes('101'))
        const idxRow3 = lines.findIndex((l) => /\b3\b/.test(l) && l.includes('101'))
        const idxDash = lines.findIndex((l) => l.includes('—') && l.includes('101'))
        const idxRow5 = lines.findIndex((l) => /\b5\b/.test(l) && l.includes('301'))
        const idxRow9 = lines.findIndex((l) => /\b9\b/.test(l) && l.includes('501'))
        expect(idxRow2).toBeGreaterThan(-1)
        expect(idxRow2).toBeLessThan(idxRow3)
        expect(idxRow3).toBeLessThan(idxDash)
        expect(idxDash).toBeLessThan(idxRow5)
        expect(idxRow5).toBeLessThan(idxRow9)
    })
})

describe('cargo alias', () => {
    test("alias subcommand exists with name 'cargo'", () => {
        expect(SUBCOMMAND_CARGO_ALIAS.name).toBe('cargo')
    })
    test('alias appliesTo same set as inventory', () => {
        expect(SUBCOMMAND_CARGO_ALIAS.appliesTo).toEqual(SUBCOMMAND.appliesTo)
    })
})
