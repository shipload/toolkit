import {
  decodePayload,
  renderItem,
  resolveItem,
} from '@shipload/item-renderer'
import { CACHE_TTL_SECONDS, MAX_PAYLOAD_CHARS } from './config.ts'
import { errorSvgResponse, errorTextResponse } from './errors.ts'
import { renderPng } from './render-png.ts'

type Ext = 'png' | 'svg'

function notFound(): Response {
  return errorTextResponse(404, 'not found')
}

function immutableHeaders(contentType: string): HeadersInit {
  return {
    'content-type': contentType,
    'cache-control': `public, max-age=${CACHE_TTL_SECONDS}, immutable`,
  }
}

async function handleItem(payload: string, ext: Ext): Promise<Response> {
  if (payload.length > MAX_PAYLOAD_CHARS) return errorSvgResponse(400)

  let cargoItem: ReturnType<typeof decodePayload>
  try {
    cargoItem = decodePayload(payload)
  } catch {
    return errorSvgResponse(400)
  }

  let resolved
  try {
    resolved = resolveItem(cargoItem.item_id, cargoItem.stats, cargoItem.modules)
  } catch {
    return errorSvgResponse(404)
  }

  const svg = renderItem(cargoItem, resolved)

  if (ext === 'svg') {
    return new Response(svg, { headers: immutableHeaders('image/svg+xml') })
  }

  const png = await renderPng(svg)
  return new Response(png, { headers: immutableHeaders('image/png') })
}

export default {
  async fetch(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url)
    if (pathname === '/healthz') return new Response('ok')

    const itemShape = pathname.match(/^\/item\/(.+)\.(png|svg)$/)
    if (!itemShape) return notFound()

    const validPayload = pathname.match(/^\/item\/([A-Za-z0-9_-]+)\.(png|svg)$/)
    if (!validPayload) return errorSvgResponse(400)

    const [, payload, ext] = validPayload
    return handleItem(payload!, ext as Ext)
  },
}
