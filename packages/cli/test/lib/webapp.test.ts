import {expect, test} from 'bun:test'
import {ABI, Action, Name} from '@wharfkit/antelope'
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

const TRANSFER_ABI = ABI.from({
    version: 'eosio::abi/1.1',
    structs: [
        {
            name: 'transfer',
            base: '',
            fields: [
                {name: 'from', type: 'name'},
                {name: 'to', type: 'name'},
                {name: 'asset_ids', type: 'uint64[]'},
                {name: 'memo', type: 'string'},
            ],
        },
    ],
    actions: [{name: 'transfer', type: 'transfer', ricardian_contract: ''}],
})

const transferAction = Action.from(
    {
        account: 'atomicassets',
        name: 'transfer',
        authorization: [{actor: 'agent.gm', permission: 'active'}],
        data: {from: 'agent.gm', to: 'eon.shipload', asset_ids: [1099511627776], memo: 'deploy'},
    },
    TRANSFER_ABI
)

test('signing summaries decode actions through an async abi lookup', async () => {
    const {summary} = await buildSigningLink(JUNGLE4, [transferAction], async () => TRANSFER_ABI)
    expect(summary).toEqual([
        'atomicassets::transfer {"from":"agent.gm","to":"eon.shipload","asset_ids":["1099511627776"],"memo":"deploy"}',
    ])
})

test('signing summaries state plainly when an abi cannot be loaded', async () => {
    const {summary} = await buildSigningLink(JUNGLE4, [transferAction], async () => {
        throw new Error('offline')
    })
    expect(summary).toEqual([
        "atomicassets::transfer (could not load this contract's ABI, so the action data is not shown)",
    ])
})
