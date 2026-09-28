import {expect, test} from 'bun:test'
import {
    resourceProviderPlugin,
    resourceRentalHint,
    withJsonContentType,
} from '../../src/lib/resources'

const JUNGLE4 = '73e4385a2708e6d7048834fbc1079f2fabb17b3c125b146af438971e90716c4d'
const VAULTA = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'

test('keeps the plugin default endpoints and refuses fees', () => {
    const plugin = resourceProviderPlugin(JUNGLE4)
    expect(plugin.getEndpoint({id: JUNGLE4} as any)).toBe('https://jungle4.greymass.com')
    expect(plugin.getEndpoint({id: VAULTA} as any)).toBe('https://eos.greymass.com')
    expect(plugin.allowFees).toBe(false)
})

test('config override replaces the provider endpoint', () => {
    const plugin = resourceProviderPlugin(JUNGLE4, 'https://provider.example/')
    expect(plugin.getEndpoint({id: JUNGLE4} as any)).toBe('https://provider.example')
})

test('rental hint for jungle4 offers powerbot and unicove', () => {
    expect(resourceRentalHint(JUNGLE4)).toBe(
        'This transaction needs more CPU or NET than the account has. Free network resources could not cover it: the service was unavailable, or the account has used its daily free quota. To keep going, the account owner can sign up for Powerbot at https://jungle4.powerbot.io, a paid service that watches the account and tops up its CPU and NET automatically. Or they can rent CPU and NET directly from the network at https://jungle4.unicove.com/en/jungle4/resources, which also manages staked resources on networks that support staking. Otherwise, retry once the daily quota resets.'
    )
})

test('rental hint without known links still names the cause and the retry', () => {
    const hint = resourceRentalHint('deadbeef')
    expect(hint).toContain('daily free quota')
    expect(hint).not.toContain('account owner can')
})

test('rental hint names the root powerbot domain for vaulta', () => {
    expect(resourceRentalHint(VAULTA)).toContain('https://powerbot.io')
})

test('string bodies without a content type are sent as JSON', async () => {
    let seen: Headers | undefined
    const base = (async (_: any, init?: RequestInit) => {
        seen = new Headers(init?.headers)
        return new Response('')
    }) as unknown as typeof fetch
    await withJsonContentType(base)('https://x', {method: 'POST', body: '{}'})
    expect(seen?.get('Content-Type')).toBe('application/json')
    await withJsonContentType(base)('https://x', {
        method: 'POST',
        body: 'a',
        headers: {'Content-Type': 'text/plain'},
    })
    expect(seen?.get('Content-Type')).toBe('text/plain')
})
