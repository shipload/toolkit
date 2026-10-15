import {
    decodeNftPayload,
    padSvg,
    renderItem,
    resolveItem,
    socialCardSvg,
} from '@shipload/item-renderer'
import {CACHE_TTL_SECONDS, MAX_PAYLOAD_CHARS, STALE_WHILE_REVALIDATE_SECONDS} from './config.ts'
import {type ErrorCode, errorSvgResponse, errorTextResponse} from './errors.ts'
import {renderPng} from './render-png.ts'

type Ext = 'png' | 'svg'

export interface Env {
    CF_VERSION_METADATA: WorkerVersionMetadata
}

function notFound(): Response {
    return errorTextResponse(404, 'not found')
}

function imageHeaders(contentType: string): HeadersInit {
    return {
        'content-type': contentType,
        'cache-control': `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`,
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

async function handleItem(
    payload: string,
    ext: Ext,
    scale: number,
    pad: number
): Promise<Response> {
    const r = decodeAndResolve(payload)
    if ('status' in r) return errorSvgResponse(r.status)
    const svg = padSvg(renderItem(r.cargoItem, r.resolved, {location: r.location}), pad)
    if (ext === 'svg') {
        // SVG is resolution-independent — density scaling only applies to raster.
        return new Response(svg, {headers: imageHeaders('image/svg+xml')})
    }
    const png = await renderPng(svg, scale)
    return new Response(png, {headers: imageHeaders('image/png')})
}

async function handleSocial(payload: string, scale: number): Promise<Response> {
    const r = decodeAndResolve(payload)
    if ('status' in r) return errorSvgResponse(r.status)
    const card = socialCardSvg(r.cargoItem, r.resolved)
    const png = await renderPng(card, scale)
    return new Response(png, {headers: imageHeaders('image/png')})
}

async function route(url: URL): Promise<Response> {
    const {pathname} = url

    // Optional pixel-density for raster output (default 1x; clamped in renderPng).
    const scale = Number(url.searchParams.get('scale') ?? '1')

    // Optional margin in unscaled panel coordinates (default 0; clamped in padSvg).
    const pad = Number(url.searchParams.get('pad') ?? '0')

    const itemMatch = pathname.match(/^\/item\/([A-Za-z0-9_-]+)\.(png|svg)$/)
    if (itemMatch) {
        const [, payload, ext] = itemMatch
        return handleItem(payload!, ext as Ext, scale, pad)
    }
    if (pathname.match(/^\/item\/.+\.(png|svg)$/)) return errorSvgResponse(400)

    const socialMatch = pathname.match(/^\/social\/([A-Za-z0-9_-]+)\.png$/)
    if (socialMatch) {
        const [, payload] = socialMatch
        return handleSocial(payload!, scale)
    }
    if (pathname.match(/^\/social\/.+\.png$/)) return errorSvgResponse(400)

    return notFound()
}

function cacheKey(url: URL, env: Env): string {
    const key = new URL(url)
    key.searchParams.set('v', env.CF_VERSION_METADATA.id)
    return key.toString()
}

export default {
    async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(req.url)
        if (url.pathname === '/healthz') return new Response('ok')

        const key = cacheKey(url, env)
        const cache = caches.default
        const cached = await cache.match(key)
        if (cached) return cached

        const res = await route(url)
        if (res.status === 200) ctx.waitUntil(cache.put(key, res.clone()))
        return res
    },
}
