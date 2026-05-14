import {expect, test, describe} from 'bun:test'
import {
    encodeCargoItem,
    decodeCargoItem,
    encodeNftPayload,
    decodeNftPayload,
} from '../src/payload/codec.ts'
import {InvalidPayloadError} from '../src/errors.ts'
import {FIXTURES} from './fixtures/cargo-items.ts'

describe('cargo_item codec (guide payload)', () => {
    test('round-trips every fixture exactly', () => {
        for (const [name, item] of Object.entries(FIXTURES)) {
            const encoded = encodeCargoItem(item)
            const decoded = decodeCargoItem(encoded)
            expect(decoded.item_id.equals(item.item_id), `${name} item_id`).toBe(true)
            expect(decoded.quantity.equals(item.quantity), `${name} quantity`).toBe(true)
            expect(decoded.stats.equals(item.stats), `${name} stats`).toBe(true)
            expect(decoded.modules.length, `${name} modules length`).toBe(item.modules.length)
        }
    })

    test('encoded payload is URL-safe', () => {
        for (const item of Object.values(FIXTURES)) {
            const encoded = encodeCargoItem(item)
            expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
        }
    })

    test('decodeCargoItem throws InvalidPayloadError on malformed input', () => {
        expect(() => decodeCargoItem('!!!')).toThrow(InvalidPayloadError)
        expect(() => decodeCargoItem('AAA')).toThrow(InvalidPayloadError)
        expect(() => decodeCargoItem('')).toThrow(InvalidPayloadError)
    })

    test('payload sizes are within expected ranges', () => {
        expect(encodeCargoItem(FIXTURES.oreT1).length).toBeLessThan(30)
        expect(encodeCargoItem(FIXTURES.shipT1NoModules).length).toBeLessThan(30)
        expect(encodeCargoItem(FIXTURES.shipT1TwoModules).length).toBeLessThan(110)
    })
})

describe('nft_item_payload codec (NFT image URL)', () => {
    test('round-trips a bare item (no location)', () => {
        const encoded = encodeNftPayload({item: FIXTURES.oreT1})
        const decoded = decodeNftPayload(encoded)
        expect(decoded.item.item_id.equals(FIXTURES.oreT1.item_id)).toBe(true)
        expect(decoded.item.stats.equals(FIXTURES.oreT1.stats)).toBe(true)
        expect(decoded.location).toBeFalsy()
    })

    test('round-trips an item with location', () => {
        const encoded = encodeNftPayload({
            item: FIXTURES.oreT1,
            location: {x: -64, y: -10},
        })
        const decoded = decodeNftPayload(encoded)
        expect(decoded.item.item_id.equals(FIXTURES.oreT1.item_id)).toBe(true)
        expect(decoded.location).toBeTruthy()
        expect(Number(decoded.location!.x)).toBe(-64)
        expect(Number(decoded.location!.y)).toBe(-10)
    })

    test('different locations produce different encodings', () => {
        const a = encodeNftPayload({item: FIXTURES.oreT1, location: {x: 0, y: 0}})
        const b = encodeNftPayload({item: FIXTURES.oreT1, location: {x: 1, y: 0}})
        expect(a).not.toBe(b)
    })

    test('absent and null location encode identically', () => {
        const a = encodeNftPayload({item: FIXTURES.oreT1})
        const b = encodeNftPayload({item: FIXTURES.oreT1, location: null})
        expect(a).toBe(b)
    })

    test('decodeNftPayload throws InvalidPayloadError on malformed input', () => {
        expect(() => decodeNftPayload('!!!')).toThrow(InvalidPayloadError)
        expect(() => decodeNftPayload('')).toThrow(InvalidPayloadError)
    })

    test('payload sizes stay reasonable', () => {
        expect(encodeNftPayload({item: FIXTURES.oreT1}).length).toBeLessThan(35)
        expect(
            encodeNftPayload({item: FIXTURES.oreT1, location: {x: -64, y: -10}}).length
        ).toBeLessThan(55)
        expect(encodeNftPayload({item: FIXTURES.shipT1TwoModules}).length).toBeLessThan(115)
    })
})
