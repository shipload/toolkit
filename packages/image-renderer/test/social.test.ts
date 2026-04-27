import { describe, expect, it } from 'vitest'
import { SELF } from 'cloudflare:test'
import { encodePayload, ServerContract } from '@shipload/item-renderer'

function oreT1Payload(): string {
  return encodePayload(
    ServerContract.Types.cargo_item.from({
      item_id: 101,
      quantity: 1,
      stats: '0x123456789ABCDEF',
      modules: [],
    }),
  )
}

const PNG_MAGIC = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

describe('GET /social/<payload>.png', () => {
  it('returns a 1200x630 social card PNG', async () => {
    const res = await SELF.fetch(`https://item.shiploadgame.com/social/${oreT1Payload()}.png`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('cache-control')).toContain('immutable')

    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(bytes.slice(0, 8)).toEqual(PNG_MAGIC)

    // PNG IHDR chunk: bytes 16-19 are width, 20-23 are height (big-endian u32).
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    expect(view.getUint32(16)).toBe(1200)
    expect(view.getUint32(20)).toBe(630)
  })

  it('returns 400 for malformed payload', async () => {
    const res = await SELF.fetch('https://item.shiploadgame.com/social/!!!not-valid!!!.png')
    expect(res.status).toBe(400)
  })
})

describe('GET /item/<payload>.png (intrinsic)', () => {
  it('does not return the 1200x630 social card', async () => {
    const res = await SELF.fetch(`https://item.shiploadgame.com/item/${oreT1Payload()}.png`)
    const bytes = new Uint8Array(await res.arrayBuffer())
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    expect(view.getUint32(16)).toBeLessThan(1000)
  })
})
