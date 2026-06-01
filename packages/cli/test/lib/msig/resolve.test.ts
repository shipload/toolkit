import {expect, test} from 'bun:test'
import {Action, Authority, Name, PermissionLevel} from '@wharfkit/antelope'
import {type AccountLookup, resolveRequested, resolveSigners} from '../../../src/lib/msig/resolve'

// Build a fake AccountLookup from a map of account -> { perm_name -> Authority }.
function fakeLookup(
    accounts: Record<string, Record<string, Authority>>,
): AccountLookup {
    return {
        v1: {
            chain: {
                async get_account(name) {
                    const perms = accounts[String(name)]
                    if (!perms) throw new Error(`unknown account ${name}`)
                    return {
                        permissions: Object.entries(perms).map(([permName, required_auth]) => ({
                            perm_name: Name.from(permName),
                            required_auth,
                        })),
                    }
                },
            },
        },
    }
}

const multisig = Authority.from({
    threshold: 2,
    keys: [],
    accounts: [
        {permission: PermissionLevel.from('alice@active'), weight: 1},
        {permission: PermissionLevel.from('bob@active'), weight: 1},
        {permission: PermissionLevel.from('carol@active'), weight: 1},
    ],
    waits: [],
})

test('returns all account auths for a true multisig', async () => {
    const lookup = fakeLookup({'eon.shipload': {active: multisig}})
    const result = await resolveSigners(lookup, PermissionLevel.from('eon.shipload@active'), new Set())
    expect(result.map((l) => l.toString())).toEqual(['alice@active', 'bob@active', 'carol@active'])
})

test('recurses through threshold=1 single-account delegation', async () => {
    const delegated = Authority.from({
        threshold: 1,
        keys: [],
        accounts: [{permission: PermissionLevel.from('eon.shipload@active'), weight: 1}],
        waits: [],
    })
    const lookup = fakeLookup({
        wrapper: {active: delegated},
        'eon.shipload': {active: multisig},
    })
    const result = await resolveSigners(lookup, PermissionLevel.from('wrapper@active'), new Set())
    expect(result.map((l) => l.toString())).toEqual(['alice@active', 'bob@active', 'carol@active'])
})

test('excludes the eosio.code self-authorization, falling back to the account itself', async () => {
    const contractActive = Authority.from({
        threshold: 1,
        keys: [{key: 'PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63', weight: 1}],
        accounts: [{permission: PermissionLevel.from('eon.shipload@eosio.code'), weight: 1}],
        waits: [],
    })
    const lookup = fakeLookup({'eon.shipload': {active: contractActive}})
    const result = await resolveSigners(lookup, PermissionLevel.from('eon.shipload@active'), new Set())
    expect(result.map((l) => l.toString())).toEqual(['eon.shipload@active'])
})

test('keeps real account auths while dropping eosio.code', async () => {
    const mixed = Authority.from({
        threshold: 2,
        keys: [],
        accounts: [
            {permission: PermissionLevel.from('alice@active'), weight: 1},
            {permission: PermissionLevel.from('bob@active'), weight: 1},
            {permission: PermissionLevel.from('eon.shipload@eosio.code'), weight: 1},
        ],
        waits: [],
    })
    const lookup = fakeLookup({'eon.shipload': {active: mixed}})
    const result = await resolveSigners(lookup, PermissionLevel.from('eon.shipload@active'), new Set())
    expect(result.map((l) => l.toString())).toEqual(['alice@active', 'bob@active'])
})

test('returns the original auth when permission is key-only', async () => {
    const keyOnly = Authority.from({
        threshold: 1,
        keys: [{key: 'PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63', weight: 1}],
        accounts: [],
        waits: [],
    })
    const lookup = fakeLookup({alice: {active: keyOnly}})
    const result = await resolveSigners(lookup, PermissionLevel.from('alice@active'), new Set())
    expect(result.map((l) => l.toString())).toEqual(['alice@active'])
})

test('resolveRequested dedupes across actions and honours override', async () => {
    const lookup = fakeLookup({'eon.shipload': {active: multisig}})
    const action = Action.from({
        account: 'eon.shipload',
        name: 'setthreshold',
        authorization: [PermissionLevel.from('eon.shipload@active')],
        data: '',
    })
    const resolved = await resolveRequested(lookup, [action, action])
    expect(resolved.map((l) => l.toString())).toEqual(['alice@active', 'bob@active', 'carol@active'])

    const override = await resolveRequested(lookup, [action], [PermissionLevel.from('dave@active')])
    expect(override.map((l) => l.toString())).toEqual(['dave@active'])
})
