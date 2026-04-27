import {describe, expect, test} from 'bun:test'
import {render} from '../../../src/commands/query/inventory'

function stack(itemId: number, quantity: number, stats: bigint) {
    return {item_id: itemId, quantity, stats, modules: []}
}

describe('inventory.render', () => {
    test('empty cargo prints empty marker', () => {
        const out = render('ship', 1n, [])
        expect(out).toContain('Inventory for ship 1')
        expect(out.toLowerCase()).toContain('empty')
    })

    test('non-empty cargo prints a table with item-id and stack-id columns', () => {
        const out = render('ship', 1n, [stack(301, 32, 214202522n), stack(201, 5, 999n)])
        expect(out).toContain('Item')
        expect(out).toContain('Item ID')
        expect(out).toContain('Stack ID')
        expect(out).toContain('Qty')
        expect(out).toContain('301')
        expect(out).toContain('214202522')
        expect(out).toContain('32')
        expect(out).toContain('201')
        expect(out).toContain('999')
    })

    test('multiple stacks of same item appear as separate rows', () => {
        const out = render('ship', 1n, [stack(301, 11, 1000n), stack(301, 21, 2000n)])
        const lines = out.split('\n')
        const stack1Row = lines.find((l) => l.includes('1000'))
        const stack2Row = lines.find((l) => l.includes('2000'))
        expect(stack1Row).toBeDefined()
        expect(stack2Row).toBeDefined()
        expect(stack1Row).toContain('11')
        expect(stack2Row).toContain('21')
    })

    test('rows sorted by item-id ascending', () => {
        const out = render('ship', 1n, [stack(501, 1, 0n), stack(101, 1, 0n), stack(301, 1, 0n)])
        const idx101 = out.indexOf('101')
        const idx301 = out.indexOf('301')
        const idx501 = out.indexOf('501')
        expect(idx101).toBeGreaterThan(0)
        expect(idx101).toBeLessThan(idx301)
        expect(idx301).toBeLessThan(idx501)
    })
})

import {SUBCOMMAND, SUBCOMMAND_CARGO_ALIAS} from '../../../src/commands/query/inventory'

describe('cargo alias', () => {
    test("alias subcommand exists with name 'cargo'", () => {
        expect(SUBCOMMAND_CARGO_ALIAS.name).toBe('cargo')
    })
    test('alias appliesTo same set as inventory', () => {
        expect(SUBCOMMAND_CARGO_ALIAS.appliesTo).toEqual(SUBCOMMAND.appliesTo)
    })
})
