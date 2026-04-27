import {expect, test} from 'bun:test'
import {InvalidPayloadError, UnknownItemError, RenderError} from '../src/errors.ts'

test('InvalidPayloadError preserves the message and is an Error', () => {
    const e = new InvalidPayloadError('bad base64')
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(InvalidPayloadError)
    expect(e.message).toBe('bad base64')
    expect(e.name).toBe('InvalidPayloadError')
})

test('UnknownItemError carries the item id', () => {
    const e = new UnknownItemError(9999)
    expect(e).toBeInstanceOf(UnknownItemError)
    expect(e.itemId).toBe(9999)
    expect(e.message).toContain('9999')
})

test('RenderError wraps a cause', () => {
    const cause = new Error('inner')
    const e = new RenderError('render failed', {cause})
    expect(e).toBeInstanceOf(RenderError)
    expect(e.cause).toBe(cause)
})
