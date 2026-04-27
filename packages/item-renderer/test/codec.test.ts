import {expect, test} from 'bun:test'
import {encodePayload, decodePayload} from '../src/payload/codec.ts'
import {InvalidPayloadError} from '../src/errors.ts'
import {FIXTURES} from './fixtures/cargo-items.ts'

test('round-trips every fixture exactly', () => {
    for (const [name, item] of Object.entries(FIXTURES)) {
        const encoded = encodePayload(item)
        const decoded = decodePayload(encoded)
        expect(decoded.item_id.equals(item.item_id), `${name} item_id`).toBe(true)
        expect(decoded.quantity.equals(item.quantity), `${name} quantity`).toBe(true)
        expect(decoded.stats.equals(item.stats), `${name} stats`).toBe(true)
        expect(decoded.modules.length, `${name} modules length`).toBe(item.modules.length)
    }
})

test('encoded payload is URL-safe', () => {
    for (const item of Object.values(FIXTURES)) {
        const encoded = encodePayload(item)
        expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    }
})

test('decodePayload throws InvalidPayloadError on malformed input', () => {
    expect(() => decodePayload('!!!')).toThrow(InvalidPayloadError)
    expect(() => decodePayload('AAA')).toThrow(InvalidPayloadError)
    expect(() => decodePayload('')).toThrow(InvalidPayloadError)
})

test('payload sizes are within expected ranges', () => {
    expect(encodePayload(FIXTURES.oreT1).length).toBeLessThan(30)
    expect(encodePayload(FIXTURES.shipT1NoModules).length).toBeLessThan(30)
    expect(encodePayload(FIXTURES.shipT1TwoModules).length).toBeLessThan(110)
})
