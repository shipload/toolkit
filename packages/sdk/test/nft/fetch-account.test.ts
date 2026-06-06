import {describe, expect, test} from 'bun:test'
import {fetchAtomicAssetsForOwner, fetchAtomicSchemas} from '../../src'

function makeStubClient(captured: {code: string}[]) {
    return {
        v1: {
            chain: {
                async get_table_rows(params: {code: {toString(): string}}) {
                    captured.push({code: String(params.code)})
                    return {rows: [], more: false}
                },
            },
        },
    } as any
}

describe('fetchAtomicAssetsForOwner account selection', () => {
    test('defaults to atomicassets when no account is given', async () => {
        const calls: {code: string}[] = []
        await fetchAtomicAssetsForOwner(makeStubClient(calls), 'agent.gm', {collection: 'shipload'})
        expect(calls[0]?.code).toBe('atomicassets')
    })

    test('queries the configured account when one is given', async () => {
        const calls: {code: string}[] = []
        await fetchAtomicAssetsForOwner(makeStubClient(calls), 'agent.gm', {
            collection: 'shipload',
            account: 'atomic.gm',
        })
        expect(calls[0]?.code).toBe('atomic.gm')
    })
})

describe('fetchAtomicSchemas account selection', () => {
    test('defaults to atomicassets when no account is given', async () => {
        const calls: {code: string}[] = []
        await fetchAtomicSchemas(makeStubClient(calls), 'shipload')
        expect(calls[0]?.code).toBe('atomicassets')
    })

    test('queries the configured account when one is given', async () => {
        const calls: {code: string}[] = []
        await fetchAtomicSchemas(makeStubClient(calls), 'shipload', 'atomic.gm')
        expect(calls[0]?.code).toBe('atomic.gm')
    })
})
