import {expect, test} from 'bun:test'
import {APIClient} from '@wharfkit/antelope'
import {Chains} from '@wharfkit/common'
import {Shipload} from '../src'

function recordingClient() {
    const paths: string[] = []
    const client = new APIClient({
        provider: {
            async call({path}) {
                paths.push(path)
                return {status: 200, headers: {}, text: '', json: {rows: [], more: false}}
            },
        },
    })
    return {client, paths}
}

test('a contract account override needs no network call', () => {
    const {client, paths} = recordingClient()
    const sdk = new Shipload(Chains.Jungle4, {
        client,
        serverContractAccount: 'shipload.gm',
        platformContractAccount: 'platform.gm',
    })
    expect(String(sdk.server.account)).toBe('shipload.gm')
    expect(String(sdk.platform.account)).toBe('platform.gm')
    expect(paths).toEqual([])
})

test('the defaults stay on the generated accounts', () => {
    const {client} = recordingClient()
    const sdk = new Shipload(Chains.Jungle4, {client})
    expect(String(sdk.server.account)).toBe('eon.shipload')
    expect(String(sdk.platform.account)).toBe('nex.shipload')
    expect(String(sdk.fund.account)).toBe('fnd.shipload')
})
