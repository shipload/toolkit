import {test, expect} from 'bun:test'
import {resolveItem} from '@shipload/sdk'
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_ENGINE_T1,
    ITEM_PLATE,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '@shipload/sdk'
import {renderItemCell, itemCellGroup, abbreviateQuantity} from '../src/templates/item-cell.ts'

test('renderItemCell returns a self-contained <svg>', () => {
    const resolved = resolveItem(ITEM_PLATE)
    const svg = renderItemCell({resolved, size: 48})
    expect(svg.startsWith('<svg ')).toBe(true)
    expect(svg).toContain('viewBox="0 0 48 60"')
    expect(svg.endsWith('</svg>')).toBe(true)
})

test('component cell renders the detailed component SVG icon', () => {
    const resolved = resolveItem(ITEM_PLATE)
    const svg = renderItemCell({resolved, size: 48})
    expect(svg).not.toContain('>PL<')
    expect(svg).toContain('data-component="plate"')
    expect(svg).toContain('#7f95a9')
})

test('module cell renders abbreviation', () => {
    const resolved = resolveItem(ITEM_ENGINE_T1)
    const svg = renderItemCell({resolved, size: 48})
    expect(svg).toContain('>EN<')
})

test('ship entity cell renders the detailed entity SVG icon', () => {
    const resolved = resolveItem(ITEM_SHIP_T1_PACKED)
    const svg = renderItemCell({resolved, size: 48})
    expect(svg).not.toContain('>SH<')
    expect(svg).toContain('data-entity="ship"')
    expect(svg).toContain('viewBox="0 0 952 1267"')
})

test('container entity cell renders the detailed entity SVG icon', () => {
    const resolved = resolveItem(ITEM_CONTAINER_T1_PACKED)
    const svg = renderItemCell({resolved, size: 48})
    expect(svg).not.toContain('>CT<')
    expect(svg).toContain('data-entity="container"')
    expect(svg).toContain('viewBox="0 0 1024 1024"')
})

test('entity cell without a premade icon renders abbreviation', () => {
    const resolved = resolveItem(ITEM_WAREHOUSE_T1_PACKED)
    const svg = renderItemCell({resolved, size: 48})
    expect(svg).toContain('>WH<')
})

test('resource cell renders the detailed resource SVG icon', () => {
    const resolved = resolveItem(101)
    const svg = renderItemCell({resolved, size: 48})
    expect(svg).not.toMatch(/>[A-Z]{2,3}</)
    expect(svg).toContain('data-resource="ore"')
    expect(svg).toContain('#C26D3F')
})

test('quantity renders as plain bold number when quantity > 1', () => {
    const resolved = resolveItem(ITEM_PLATE)
    const svg = renderItemCell({resolved, quantity: 42, size: 48})
    expect(svg).toContain('>42<')
    expect(svg).not.toContain('×')
})

test('no quantity text when quantity is 1 or omitted', () => {
    const resolved = resolveItem(ITEM_PLATE)
    const svgNoQty = renderItemCell({resolved, size: 48})
    const svgOne = renderItemCell({resolved, quantity: 1, size: 48})
    expect(svgNoQty).not.toContain('>1<')
    expect(svgOne).not.toContain('>1<')
})

test('abbreviateQuantity compacts large counts', () => {
    expect(abbreviateQuantity(999)).toBe('999')
    expect(abbreviateQuantity(1500)).toBe('1.5k')
    expect(abbreviateQuantity(123456)).toBe('123.5k')
    expect(abbreviateQuantity(150000)).toBe('150k')
    expect(abbreviateQuantity(1234567)).toBe('1.2m')
    expect(abbreviateQuantity(2_000_000)).toBe('2m')
})

test('large quantity renders abbreviated in the cell', () => {
    const resolved = resolveItem(ITEM_PLATE)
    const svg = renderItemCell({resolved, quantity: 150000, size: 48})
    expect(svg).toContain('>150k<')
    expect(svg).not.toContain('>150000<')
})

test('quantityPrefix forces display (even of 1) and prefixes the sign', () => {
    const resolved = resolveItem(ITEM_PLATE)
    const svg = renderItemCell({resolved, quantity: 1, quantityPrefix: '+', size: 48})
    expect(svg).toContain('>+1<')
})

test('quantityColor tints the quantity text', () => {
    const resolved = resolveItem(ITEM_PLATE)
    const svg = renderItemCell({resolved, quantity: 5, quantityColor: '#54d36e', size: 48})
    expect(svg).toContain('fill="#54d36e"')
})

test('itemCellGroup returns <g> with translate, no <svg> wrapper', () => {
    const resolved = resolveItem(ITEM_PLATE)
    const g = itemCellGroup({resolved, size: 48, x: 100, y: 200})
    expect(g.startsWith('<g ')).toBe(true)
    expect(g).toContain('transform="translate(100, 200)"')
    expect(g.startsWith('<svg')).toBe(false)
})

test('tier border uses SDK tierColors for the resolved tier', () => {
    const resolved = resolveItem(ITEM_PLATE)
    const svg = renderItemCell({resolved, size: 48})
    expect(svg).toContain('#8b8b8b')
})

test('module abbreviation cell uses proportional font size for different sizes', () => {
    const resolved = resolveItem(ITEM_ENGINE_T1)
    const svg28 = renderItemCell({resolved, size: 28})
    const svg80 = renderItemCell({resolved, size: 80})
    expect(svg28).toContain('font-size="10"')
    expect(svg80).toContain('font-size="29"')
})

test('resource cell uses the same icon pipeline for gas', () => {
    const resolved = resolveItem(301)
    const svg = renderItemCell({resolved, size: 48})
    expect(svg).toContain('data-resource="gas"')
    expect(svg).toContain('#B877FF')
    expect(svg).not.toContain('#B8E4A0')
})

test('resource cell does not crash when category is missing', () => {
    const resolved = {...resolveItem(101), category: undefined}
    const svg = renderItemCell({resolved, size: 48})
    expect(svg.startsWith('<svg ')).toBe(true)
    expect(svg).not.toContain('data-resource=')
})

test('matches golden SVG snapshot per itemType', () => {
    const cases: [number, string][] = [
        [101, 'item-cell-resource'],
        [ITEM_PLATE, 'item-cell-component'],
        [ITEM_ENGINE_T1, 'item-cell-module'],
        [ITEM_SHIP_T1_PACKED, 'item-cell-entity'],
    ]
    for (const [id, name] of cases) {
        const svg = renderItemCell({resolved: resolveItem(id), quantity: 3, size: 48})
        expect(svg).toMatchSnapshot(name)
    }
})
