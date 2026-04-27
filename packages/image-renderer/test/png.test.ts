import {describe, expect, it} from 'vitest'
import {SELF} from 'cloudflare:test'
import {encodePayload, ServerContract} from '@shipload/item-renderer'

function oreT1Payload(): string {
    return encodePayload(
        ServerContract.Types.cargo_item.from({
            item_id: 101,
            quantity: 1,
            stats: '0x123456789ABCDEF',
            modules: [],
        })
    )
}

const PNG_MAGIC = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

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
