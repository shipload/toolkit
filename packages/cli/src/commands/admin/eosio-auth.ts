import {
    type ABIDef,
    Action,
    type PermissionLevel,
    PublicKey,
    type PublicKeyType,
} from '@wharfkit/antelope'

const EOSIO_AUTH_ABI: ABIDef = {
    version: 'eosio::abi/1.2',
    types: [],
    structs: [
        {
            name: 'key_weight',
            base: '',
            fields: [
                {name: 'key', type: 'public_key'},
                {name: 'weight', type: 'uint16'},
            ],
        },
        {
            name: 'permission_level',
            base: '',
            fields: [
                {name: 'actor', type: 'name'},
                {name: 'permission', type: 'name'},
            ],
        },
        {
            name: 'permission_level_weight',
            base: '',
            fields: [
                {name: 'permission', type: 'permission_level'},
                {name: 'weight', type: 'uint16'},
            ],
        },
        {
            name: 'wait_weight',
            base: '',
            fields: [
                {name: 'wait_sec', type: 'uint32'},
                {name: 'weight', type: 'uint16'},
            ],
        },
        {
            name: 'authority',
            base: '',
            fields: [
                {name: 'threshold', type: 'uint32'},
                {name: 'keys', type: 'key_weight[]'},
                {name: 'accounts', type: 'permission_level_weight[]'},
                {name: 'waits', type: 'wait_weight[]'},
            ],
        },
        {
            name: 'updateauth',
            base: '',
            fields: [
                {name: 'account', type: 'name'},
                {name: 'permission', type: 'name'},
                {name: 'parent', type: 'name'},
                {name: 'auth', type: 'authority'},
            ],
        },
        {
            name: 'deleteauth',
            base: '',
            fields: [
                {name: 'account', type: 'name'},
                {name: 'permission', type: 'name'},
            ],
        },
    ],
    actions: [
        {name: 'updateauth', type: 'updateauth', ricardian_contract: ''},
        {name: 'deleteauth', type: 'deleteauth', ricardian_contract: ''},
    ],
    tables: [],
    ricardian_clauses: [],
}

/** A single-key authority at threshold 1, the shape every oracle handle permission carries. */
export function singleKeyAuthority(pubkey: PublicKeyType) {
    return {
        threshold: 1,
        keys: [{key: PublicKey.from(pubkey), weight: 1}],
        accounts: [],
        waits: [],
    }
}

export function buildUpdateAuth(
    args: {account: string; permission: string; parent: string; pubkey: PublicKeyType},
    authorization: PermissionLevel[]
): Action {
    return Action.from(
        {
            account: 'eosio',
            name: 'updateauth',
            authorization,
            data: {
                account: args.account,
                permission: args.permission,
                parent: args.parent,
                auth: singleKeyAuthority(args.pubkey),
            },
        },
        EOSIO_AUTH_ABI
    )
}

export function buildDeleteAuth(
    args: {account: string; permission: string},
    authorization: PermissionLevel[]
): Action {
    return Action.from(
        {
            account: 'eosio',
            name: 'deleteauth',
            authorization,
            data: {account: args.account, permission: args.permission},
        },
        EOSIO_AUTH_ABI
    )
}
