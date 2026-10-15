import {describe, expect, it} from 'vitest'
import {createExecutionContext, env, waitOnExecutionContext} from 'cloudflare:test'
import {encodeNftPayload, ServerContract} from '@shipload/item-renderer'
import worker, {type Env} from '../src/index.ts'

function oreT1Payload(): string {
    return encodeNftPayload({
        item: ServerContract.Types.cargo_item.from({
            item_id: 101,
            quantity: 1,
            stats: '33123456790123455',
            modules: [],
        }),
    })
}

function withVersion(id: string): Env {
    return {...(env as Env), CF_VERSION_METADATA: {id, tag: '', timestamp: ''}}
}

async function get(url: string, workerEnv: Env): Promise<Response> {
    const ctx = createExecutionContext()
    const res = await worker.fetch(new Request(url), workerEnv, ctx)
    await waitOnExecutionContext(ctx)
    return res
}

describe('render cache', () => {
    it('serves a repeat request from the cache', async () => {
        const url = `https://item.shiploadgame.com/item/${oreT1Payload()}.png?scale=2`
        const versioned = withVersion('deploy-a')

        const first = await get(url, versioned)
        expect(first.status).toBe(200)
        expect(first.headers.get('cf-cache-status')).toBeNull()
        const firstBytes = new Uint8Array(await first.arrayBuffer())

        const second = await get(url, versioned)
        expect(second.status).toBe(200)
        expect(second.headers.get('cf-cache-status')).toBe('HIT')
        expect(second.headers.get('cache-control')).toBe(
            'public, max-age=86400, stale-while-revalidate=604800'
        )
        expect(new Uint8Array(await second.arrayBuffer())).toEqual(firstBytes)
    })

    it('starts a fresh cache for each worker version', async () => {
        const url = `https://item.shiploadgame.com/social/${oreT1Payload()}.png`

        await get(url, withVersion('deploy-b'))
        expect((await get(url, withVersion('deploy-b'))).headers.get('cf-cache-status')).toBe('HIT')
        expect((await get(url, withVersion('deploy-c'))).headers.get('cf-cache-status')).toBeNull()
    })

    it('keeps error responses out of the cache', async () => {
        const url = 'https://item.shiploadgame.com/item/!!!not-valid!!!.svg'
        const versioned = withVersion('deploy-d')

        const first = await get(url, versioned)
        expect(first.status).toBe(400)
        expect(first.headers.get('cache-control')).toBe('public, max-age=300')

        const second = await get(url, versioned)
        expect(second.status).toBe(400)
        expect(second.headers.get('cf-cache-status')).toBeNull()
    })
})
