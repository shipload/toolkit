import {test, expect} from 'bun:test'
import {categoryIconSvg, categoryIconPath} from '../src/primitives/category-icon.ts'

test('categoryIconSvg returns self-contained <svg> for each shape', () => {
    for (const shape of ['hex', 'diamond', 'star', 'circle', 'square'] as const) {
        const svg = categoryIconSvg(shape)
        expect(svg.startsWith('<svg ')).toBe(true)
        expect(svg.endsWith('</svg>')).toBe(true)
        expect(svg).toContain('viewBox=')
    }
})

test('categoryIconSvg respects size option', () => {
    const svg = categoryIconSvg('hex', {size: 24})
    expect(svg).toContain('width="24"')
    expect(svg).toContain('height="24"')
    expect(svg).toContain('viewBox="0 0 24 24"')
})

test('categoryIconSvg respects color option', () => {
    const svg = categoryIconSvg('hex', {color: '#ff0000'})
    expect(svg).toContain('#ff0000')
})

test('categoryIconPath returns inline element at given coordinates without svg wrapper', () => {
    const path = categoryIconPath({shape: 'diamond', cx: 50, cy: 50, size: 20, color: '#00ff00'})
    expect(path.startsWith('<svg')).toBe(false)
    expect(path).toMatch(/^<(polygon|rect|circle)\b/)
    expect(path).toContain('#00ff00')
})

test('hex shape produces a 6-point polygon', () => {
    const path = categoryIconPath({shape: 'hex', cx: 50, cy: 50, size: 40, color: '#fff'})
    expect(path).toContain('<polygon')
    const match = path.match(/points="([^"]+)"/)
    expect(match).not.toBeNull()
    const pointCount = match![1].trim().split(/\s+/).length
    expect(pointCount).toBe(6)
})

test('star shape produces a 10-vertex polygon', () => {
    const path = categoryIconPath({shape: 'star', cx: 50, cy: 50, size: 40, color: '#fff'})
    const match = path.match(/points="([^"]+)"/)
    expect(match).not.toBeNull()
    const pointCount = match![1].trim().split(/\s+/).length
    expect(pointCount).toBe(10)
})

test('circle shape produces a <circle> element', () => {
    const path = categoryIconPath({shape: 'circle', cx: 50, cy: 50, size: 40, color: '#abc'})
    expect(path).toMatch(/^<circle\b/)
    expect(path).toContain('cx="50"')
    expect(path).toContain('cy="50"')
    expect(path).toContain('r="20"')
})

test('square shape produces a <rect> element', () => {
    const path = categoryIconPath({shape: 'square', cx: 50, cy: 50, size: 40, color: '#abc'})
    expect(path).toMatch(/^<rect\b/)
    expect(path).toContain('width="40"')
    expect(path).toContain('height="40"')
    expect(path).toContain('x="30"')
    expect(path).toContain('y="30"')
})

test('strokeWidth renders outline mode: fill=none, stroke=color', () => {
    for (const shape of ['hex', 'diamond', 'star', 'circle', 'square'] as const) {
        const path = categoryIconPath({
            shape,
            cx: 50,
            cy: 50,
            size: 40,
            color: '#ff0000',
            strokeWidth: 2,
        })
        expect(path).toContain('fill="none"')
        expect(path).toContain('stroke="#ff0000"')
        expect(path).toContain('stroke-width="2"')
    }
})

test('fill mode (no strokeWidth) does not produce stroke attributes', () => {
    const path = categoryIconPath({shape: 'hex', cx: 50, cy: 50, size: 40, color: '#ff0000'})
    expect(path).toContain('fill="#ff0000"')
    expect(path).not.toContain('stroke=')
})
