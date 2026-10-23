import {describe, expect, test} from 'bun:test'
import {type Action, API, PermissionLevel, PrivateKey} from '@wharfkit/antelope'
import {planGameTier} from '../../../src/commands/auth/create'
import {planGameTierRevoke} from '../../../src/commands/auth/revoke'
import {reportGameTier} from '../../../src/commands/auth/status'
import {EOSIO_AUTH_ABI} from '../../../src/lib/auth/actions'
import {gamePermission} from '../../../src/commands/sandbox/guard'

const sandboxAbi = async () => ['sbspawn', 'travel']
const liveAbi = async () => ['travel', 'join']
const pubkey = PrivateKey.generate('K1').toPublic()
const authorization = [PermissionLevel.from('player.gm@active')]

function field(action: Action | undefined, key: string): string {
    const data = action?.decodeData(EOSIO_AUTH_ABI) as unknown as Record<string, unknown>
    return String(data[key])
}

function accountWith(permission: string, contract: string): API.v1.AccountObject {
    return API.v1.AccountObject.from({
        account_name: 'player.gm',
        head_block_num: 1,
        head_block_time: '2026-01-01T00:00:00',
        privileged: false,
        last_code_update: '1970-01-01T00:00:00',
        created: '2026-01-01T00:00:00',
        ram_quota: 0,
        net_weight: 0,
        cpu_weight: 0,
        net_limit: {used: 0, available: 0, max: 0},
        cpu_limit: {used: 0, available: 0, max: 0},
        ram_usage: 0,
        permissions: [
            {
                perm_name: 'active',
                parent: 'owner',
                required_auth: {threshold: 1, keys: [], accounts: [], waits: []},
            },
            {
                perm_name: permission,
                parent: 'active',
                required_auth: {
                    threshold: 1,
                    keys: [{key: String(pubkey), weight: 1}],
                    accounts: [],
                    waits: [],
                },
                linked_actions: [{account: contract}],
            },
        ],
        total_resources: null,
        self_delegated_bandwidth: null,
        refund_request: null,
        voter_info: null,
    })
}

describe('gamePermission', () => {
    test('names shiploadsb for a Sandbox server and shipload otherwise', async () => {
        expect(await gamePermission('box.shipload', sandboxAbi)).toBe('shiploadsb')
        expect(await gamePermission('eon.shipload', liveAbi)).toBe('shipload')
    })
})

describe('auth create game tier', () => {
    const base = {actor: 'player.gm', pubkey, account: undefined, authorization}

    test('plans and writes shiploadsb against a Sandbox server', async () => {
        const {plan, configUpdates} = await planGameTier({
            ...base,
            contract: 'box.shipload',
            lookup: sandboxAbi,
        })
        expect(String(plan.updateAuth?.name)).toBe('updateauth')
        expect(String(plan.linkAuth?.name)).toBe('linkauth')
        expect(field(plan.updateAuth, 'permission')).toBe('shiploadsb')
        expect(field(plan.linkAuth, 'requirement')).toBe('shiploadsb')
        expect(configUpdates).toEqual({server_permission: 'shiploadsb'})
    })

    test('keeps shipload against the live server', async () => {
        const {plan, configUpdates} = await planGameTier({
            ...base,
            contract: 'eon.shipload',
            lookup: liveAbi,
        })
        expect(field(plan.updateAuth, 'permission')).toBe('shipload')
        expect(field(plan.linkAuth, 'requirement')).toBe('shipload')
        expect(configUpdates).toEqual({server_permission: 'shipload'})
    })
})

describe('auth status game tier', () => {
    test('reads shiploadsb against a Sandbox server', async () => {
        const lines = await reportGameTier(
            accountWith('shiploadsb', 'box.shipload'),
            'box.shipload',
            String(pubkey),
            sandboxAbi
        )
        expect(lines).toContain('shiploadsb: exists, parent active')
        expect(lines).toContain('shiploadsb: linked to box.shipload')
    })

    test('reads shipload against the live server', async () => {
        const lines = await reportGameTier(
            accountWith('shipload', 'eon.shipload'),
            'eon.shipload',
            String(pubkey),
            liveAbi
        )
        expect(lines).toContain('shipload: exists, parent active')
        expect(lines).toContain('shipload: linked to eon.shipload')
    })
})

describe('auth revoke game tier', () => {
    test('removes shiploadsb against a Sandbox server', async () => {
        const {actions} = await planGameTierRevoke(
            accountWith('shiploadsb', 'box.shipload'),
            'player.gm',
            'box.shipload',
            String(pubkey),
            authorization,
            sandboxAbi
        )
        expect(actions.map((a) => String(a.name))).toEqual(['unlinkauth', 'deleteauth'])
        expect(field(actions[1], 'permission')).toBe('shiploadsb')
    })

    test('removes shipload against the live server', async () => {
        const {actions} = await planGameTierRevoke(
            accountWith('shipload', 'eon.shipload'),
            'player.gm',
            'eon.shipload',
            String(pubkey),
            authorization,
            liveAbi
        )
        expect(field(actions[1], 'permission')).toBe('shipload')
    })
})
