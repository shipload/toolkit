import {expect, test} from 'bun:test'
import {clampPad, padSvg} from '../src/primitives/pad.ts'
import {svgDimensions} from '../src/meta.ts'
import {tokens} from '../src/tokens/index.ts'

const CARD =
    '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="120" viewBox="0 0 280 120"><rect x="0.5" y="0.5" width="279" height="119"/></svg>'

test('padSvg grows the canvas by the margin on all four sides', () => {
    const padded = padSvg(CARD, 28)
    expect(svgDimensions(padded)).toEqual({width: 336, height: 176})
    expect(padded).toContain('viewBox="0 0 336 176"')
})

test('padSvg fills the margin with the deep space colour and offsets the card into it', () => {
    const padded = padSvg(CARD, 28)
    expect(padded).toContain(`fill="${tokens.colors.surface.spaceDeep}"`)
    expect(padded).toContain('<g transform="translate(28 28)">')
    expect(padded).toContain('<rect x="0.5" y="0.5" width="279" height="119"/>')
})

test('padSvg returns the card untouched at zero pad', () => {
    expect(padSvg(CARD, 0)).toBe(CARD)
})

test('clampPad rounds and holds the margin within 0..64', () => {
    expect(clampPad(28.4)).toBe(28)
    expect(clampPad(-10)).toBe(0)
    expect(clampPad(500)).toBe(64)
    expect(clampPad(Number.NaN)).toBe(0)
})

test('padSvg clamps rather than trusting the caller', () => {
    expect(svgDimensions(padSvg(CARD, 500))).toEqual({width: 408, height: 248})
    expect(padSvg(CARD, -1)).toBe(CARD)
})
