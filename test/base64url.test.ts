import { expect, test } from 'bun:test'
import { bytesToBase64Url, base64UrlToBytes } from '../src/payload/base64url.ts'
import { InvalidPayloadError } from '../src/errors.ts'

test('round-trips arbitrary bytes', () => {
  const inputs = [
    new Uint8Array([0]),
    new Uint8Array([255]),
    new Uint8Array([0, 1, 2, 3, 4, 5]),
    new Uint8Array(Array.from({ length: 256 }, (_, i) => i)),
  ]
  for (const input of inputs) {
    const encoded = bytesToBase64Url(input)
    const decoded = base64UrlToBytes(encoded)
    expect(decoded).toEqual(input)
  }
})

test('produces only URL-safe characters — no +, /, =', () => {
  const bytes = new Uint8Array(Array.from({ length: 256 }, (_, i) => i))
  const encoded = bytesToBase64Url(bytes)
  expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
})

test('rejects malformed base64url with InvalidPayloadError', () => {
  expect(() => base64UrlToBytes('!!!not-base64!!!')).toThrow(InvalidPayloadError)
  expect(() => base64UrlToBytes('has spaces')).toThrow(InvalidPayloadError)
  expect(() => base64UrlToBytes('with+plus/slash')).toThrow(InvalidPayloadError)
})

test('accepts known-good short string', () => {
  expect(base64UrlToBytes('AAA')).toEqual(new Uint8Array([0, 0]))
})
