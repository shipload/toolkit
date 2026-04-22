import { describe, expect, it } from 'vitest'
import { SELF } from 'cloudflare:test'
import { encodePayload, ServerContract } from '@shipload/item-renderer'

function ironPayload(): string {
  return encodePayload(
    ServerContract.Types.cargo_item.from({
      item_id: 26,
      quantity: 1,
      stats: '0x123456789ABCDEF',
      modules: [],
    }),
  )
}

describe('GET /item/<payload>.svg', () => {
  it('returns an SVG with immutable cache headers', async () => {
    const res = await SELF.fetch(`https://item.shiploadgame.com/item/${ironPayload()}.svg`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/svg+xml')
    expect(res.headers.get('cache-control')).toContain('immutable')
    expect(res.headers.get('cache-control')).toContain('max-age=31536000')
    const body = await res.text()
    expect(body).toContain('<svg')
    expect(body).toContain('Iron')
  })

  it('returns 400 for malformed payload', async () => {
    const res = await SELF.fetch('https://item.shiploadgame.com/item/!!!not-valid!!!.svg')
    expect(res.status).toBe(400)
  })

  it('returns 404 for unknown paths', async () => {
    const res = await SELF.fetch('https://item.shiploadgame.com/nope')
    expect(res.status).toBe(404)
  })
})
