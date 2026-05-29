import {describe, expect, it} from 'vitest'
import {SELF} from 'cloudflare:test'
import {encodeNftPayload, ServerContract} from '@shipload/item-renderer'

function oreT1Payload(): string {
    return encodeNftPayload({
        item: ServerContract.Types.cargo_item.from({
            item_id: 101,
            quantity: 1,
            stats: '0x123456789ABCDEF',
            modules: [],
        }),
    })
}

const PNG_MAGIC = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

// PNG IHDR dimensions: width at byte offset 16, height at 20 (after 8-byte magic
// + 8-byte chunk header), both big-endian.
function pngDims(bytes: Uint8Array): {width: number; height: number} {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    return {width: view.getUint32(16, false), height: view.getUint32(20, false)}
}

async function fetchPngDims(url: string): Promise<{width: number; height: number}> {
    const res = await SELF.fetch(url)
    expect(res.status).toBe(200)
    return pngDims(new Uint8Array(await res.arrayBuffer()))
}

describe('GET /item/<payload>.png', () => {
    it('returns a PNG with immutable cache headers', async () => {
        const res = await SELF.fetch(`https://item.shiploadgame.com/item/${oreT1Payload()}.png`)
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toBe('image/png')
        expect(res.headers.get('cache-control')).toContain('immutable')
        expect(res.headers.get('cache-control')).toContain('max-age=31536000')

        const bytes = new Uint8Array(await res.arrayBuffer())
        expect(bytes.length).toBeGreaterThan(500)
        expect(bytes.slice(0, 8)).toEqual(PNG_MAGIC)
    })

    it('returns 400 for malformed payload', async () => {
        const res = await SELF.fetch('https://item.shiploadgame.com/item/!!!not-valid!!!.png')
        expect(res.status).toBe(400)
    })
})

describe('GET /item/<payload>.png?scale=', () => {
    const base = `https://item.shiploadgame.com/item/${oreT1Payload()}.png`

    it('renders at 1x by default', async () => {
        const d1 = await fetchPngDims(base)
        expect(d1.width).toBeGreaterThan(0)
        expect(d1.height).toBeGreaterThan(0)
        // ?scale=1 is identical to no param
        expect(await fetchPngDims(`${base}?scale=1`)).toEqual(d1)
    })

    it('scale=2 doubles both dimensions (aspect ratio preserved)', async () => {
        const d1 = await fetchPngDims(base)
        expect(await fetchPngDims(`${base}?scale=2`)).toEqual({
            width: d1.width * 2,
            height: d1.height * 2,
        })
    })

    it('scale=3 triples both dimensions', async () => {
        const d1 = await fetchPngDims(base)
        expect(await fetchPngDims(`${base}?scale=3`)).toEqual({
            width: d1.width * 3,
            height: d1.height * 3,
        })
    })

    it('clamps out-of-range scale to 3x', async () => {
        const d1 = await fetchPngDims(base)
        expect(await fetchPngDims(`${base}?scale=9`)).toEqual({
            width: d1.width * 3,
            height: d1.height * 3,
        })
    })

    it('falls back to 1x for invalid scale', async () => {
        const d1 = await fetchPngDims(base)
        expect(await fetchPngDims(`${base}?scale=abc`)).toEqual(d1)
        expect(await fetchPngDims(`${base}?scale=0`)).toEqual(d1)
    })
})
