import {expect, test} from 'bun:test'
import {Action, Name} from '@wharfkit/antelope'
import {buildSigningLink} from '../../src/lib/auth/signing-link'
import {webappSignUrl} from '../../src/lib/webapp'

const JUNGLE4 = '73e4385a2708e6d7048834fbc1079f2fabb17b3c125b146af438971e90716c4d'

test('builds jungle4 sign url on the deployed webapp', () => {
    expect(webappSignUrl(JUNGLE4, 'gmNg')).toBe('https://dev.shiploadgame.com/sign/gmNg')
})

test('config override replaces the origin and drops trailing slashes', () => {
    expect(webappSignUrl(JUNGLE4, 'gmNg', 'http://localhost:5173/')).toBe(
        'http://localhost:5173/sign/gmNg'
    )
    expect(webappSignUrl('deadbeef', 'gmNg', 'http://localhost:5173')).toBe(
        'http://localhost:5173/sign/gmNg'
    )
})

test('returns null for unknown chain id without an override', () => {
    expect(webappSignUrl('deadbeef', 'gmNg')).toBeNull()
})

test('signing links carry the esr payload without its scheme', async () => {
    const action = Action.from({
        account: Name.from('eon.shipload'),
        name: Name.from('noop'),
        authorization: [{actor: 'agent.gm', permission: 'active'}],
        data: '',
    })
    const {url} = await buildSigningLink(JUNGLE4, [action])
    expect(url.startsWith('https://dev.shiploadgame.com/sign/')).toBe(true)
    expect(url).not.toContain('esr:')
    expect(url.split('/sign/')[1].length).toBeGreaterThan(0)
})
