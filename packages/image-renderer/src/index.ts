import {decodeNftPayload, renderItem, resolveItem, socialCardSvg} from '@shipload/item-renderer'
import {CACHE_TTL_SECONDS, MAX_PAYLOAD_CHARS} from './config.ts'
import {type ErrorCode, errorSvgResponse, errorTextResponse} from './errors.ts'
import {renderPng} from './render-png.ts'

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

type DecodeError = {status: ErrorCode}
type DecodeOk = {
    cargoItem: ReturnType<typeof decodeNftPayload>['item']
    location?: {x: number; y: number}
    resolved: ReturnType<typeof resolveItem>
}

function decodeAndResolve(payload: string): DecodeError | DecodeOk {
    if (payload.length > MAX_PAYLOAD_CHARS) return {status: 400}
    try {
        const decoded = decodeNftPayload(payload)
        const cargoItem = decoded.item
        const location = decoded.location
            ? {x: Number(decoded.location.x), y: Number(decoded.location.y)}
            : undefined
        try {
            const resolved = resolveItem(cargoItem.item_id, cargoItem.stats, cargoItem.modules)
            return {cargoItem, location, resolved}
        } catch {
            return {status: 404}
        }
    } catch {
        return {status: 400}
    }
}

async function handleItem(payload: string, ext: Ext, scale: number): Promise<Response> {
    const r = decodeAndResolve(payload)
    if ('status' in r) return errorSvgResponse(r.status)
    const svg = renderItem(r.cargoItem, r.resolved, {location: r.location})
    if (ext === 'svg') {
        // SVG is resolution-independent — density scaling only applies to raster.
        return new Response(svg, {headers: immutableHeaders('image/svg+xml')})
    }
    const png = await renderPng(svg, scale)
    return new Response(png, {headers: immutableHeaders('image/png')})
}

async function handleSocial(payload: string, scale: number): Promise<Response> {
    const r = decodeAndResolve(payload)
    if ('status' in r) return errorSvgResponse(r.status)
    const card = socialCardSvg(r.cargoItem, r.resolved)
    const png = await renderPng(card, scale)
    return new Response(png, {headers: immutableHeaders('image/png')})
}

export default {
    async fetch(req: Request): Promise<Response> {
        const url = new URL(req.url)
        const {pathname} = url
        if (pathname === '/healthz') return new Response('ok')

        // Optional pixel-density for raster output (default 1x; clamped in renderPng).
        const scale = Number(url.searchParams.get('scale') ?? '1')

        const itemMatch = pathname.match(/^\/item\/([A-Za-z0-9_-]+)\.(png|svg)$/)
        if (itemMatch) {
            const [, payload, ext] = itemMatch
            return handleItem(payload!, ext as Ext, scale)
        }
        if (pathname.match(/^\/item\/.+\.(png|svg)$/)) return errorSvgResponse(400)

        const socialMatch = pathname.match(/^\/social\/([A-Za-z0-9_-]+)\.png$/)
        if (socialMatch) {
            const [, payload] = socialMatch
            return handleSocial(payload!, scale)
        }
        if (pathname.match(/^\/social\/.+\.png$/)) return errorSvgResponse(400)

        return notFound()
    },
}
