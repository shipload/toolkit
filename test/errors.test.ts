import { describe, expect, it } from 'vitest'
import { errorSvgResponse, errorTextResponse } from '../src/errors.ts'

describe('errorSvgResponse', () => {
  it('returns a 400 SVG response', async () => {
    const res = errorSvgResponse(400)
    expect(res.status).toBe(400)
    expect(res.headers.get('content-type')).toBe('image/svg+xml')
    const body = await res.text()
    expect(body).toContain('Invalid item link')
  })

  it('returns a 404 SVG response', async () => {
    const res = errorSvgResponse(404)
    expect(res.status).toBe(404)
    const body = await res.text()
    expect(body).toContain('Unknown item')
  })
})

describe('errorTextResponse', () => {
  it('returns a text response with the given message', async () => {
    const res = errorTextResponse(500, 'boom')
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('boom')
  })
})
