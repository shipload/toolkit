import {
    ABI,
    type ABIDef,
    Action,
    type APIClient,
    type NameType,
    Name,
    PermissionLevel,
    UInt64,
} from '@wharfkit/antelope'
import {deserializeAtomicData, type SchemaField} from './atomicdata'
import {deserializeAsset, type NFTCargoItem, type NFTModuleSlot} from './deserializers'
import type {ImmutableEntry} from './buildImmutableData'
import atomicAssetsAbi from './atomicassets.abi.json'

const PLACEHOLDER_AUTH = PermissionLevel.from({
    actor: '............1',
    permission: '............2',
})

export const ATOMICASSETS_ACCOUNT = 'atomicassets'
export const SHIPLOAD_COLLECTION = 'shipload'

export const ATOMICASSETS_ABI = ABI.from(atomicAssetsAbi as ABIDef)

const ATOMIC_ATTRIBUTE_VARIANT_NAME =
    'variant_int8_int16_int32_int64_uint8_uint16_uint32_uint64_float32_float64_string_INT8_VEC_INT16_VEC_INT32_VEC_INT64_VEC_UINT8_VEC_UINT16_VEC_UINT32_VEC_UINT64_VEC_FLOAT_VEC_DOUBLE_VEC_STRING_VEC'

const MINTASSET_ABI_DEF: ABIDef = {
    version: 'eosio::abi/1.2',
    types: [
        {new_type_name: 'ATOMIC_ATTRIBUTE', type: ATOMIC_ATTRIBUTE_VARIANT_NAME},
        {new_type_name: 'ATTRIBUTE_MAP', type: 'pair_string_ATOMIC_ATTRIBUTE[]'},
        {new_type_name: 'INT8_VEC', type: 'bytes'},
        {new_type_name: 'INT16_VEC', type: 'int16[]'},
        {new_type_name: 'INT32_VEC', type: 'int32[]'},
        {new_type_name: 'INT64_VEC', type: 'int64[]'},
        {new_type_name: 'UINT8_VEC', type: 'bytes'},
        {new_type_name: 'UINT16_VEC', type: 'uint16[]'},
        {new_type_name: 'UINT32_VEC', type: 'uint32[]'},
        {new_type_name: 'UINT64_VEC', type: 'uint64[]'},
        {new_type_name: 'FLOAT_VEC', type: 'float32[]'},
        {new_type_name: 'DOUBLE_VEC', type: 'float64[]'},
        {new_type_name: 'STRING_VEC', type: 'string[]'},
    ],
    structs: [
        {
            name: 'pair_string_ATOMIC_ATTRIBUTE',
            base: '',
            fields: [
                {name: 'first', type: 'string'},
                {name: 'second', type: 'ATOMIC_ATTRIBUTE'},
            ],
        },
        {
            name: 'mintasset',
            base: '',
            fields: [
                {name: 'authorized_minter', type: 'name'},
                {name: 'collection_name', type: 'name'},
                {name: 'schema_name', type: 'name'},
                {name: 'template_id', type: 'int32'},
                {name: 'new_asset_owner', type: 'name'},
                {name: 'immutable_data', type: 'ATTRIBUTE_MAP'},
                {name: 'mutable_data', type: 'ATTRIBUTE_MAP'},
                {name: 'tokens_to_back', type: 'asset[]'},
            ],
        },
    ],
    actions: [{name: 'mintasset', type: 'mintasset', ricardian_contract: ''}],
    variants: [
        {
            name: ATOMIC_ATTRIBUTE_VARIANT_NAME,
            types: [
                'int8',
                'int16',
                'int32',
                'int64',
                'uint8',
                'uint16',
                'uint32',
                'uint64',
                'float32',
                'float64',
                'string',
                'INT8_VEC',
                'INT16_VEC',
                'INT32_VEC',
                'INT64_VEC',
                'UINT8_VEC',
                'UINT16_VEC',
                'UINT32_VEC',
                'UINT64_VEC',
                'FLOAT_VEC',
                'DOUBLE_VEC',
                'STRING_VEC',
            ],
        },
    ],
}

export interface MintAssetParams {
    authorizedMinter: NameType
    collectionName: NameType
    schemaName: NameType
    templateId: number
    newAssetOwner: NameType
    immutableData: ImmutableEntry[]
}

const MINTASSET_ABI = ABI.from(MINTASSET_ABI_DEF)

export function buildMintAssetAction(params: MintAssetParams): Action {
    return Action.from(
        {
            account: Name.from(ATOMICASSETS_ACCOUNT),
            name: Name.from('mintasset'),
            authorization: [PLACEHOLDER_AUTH],
            data: {
                authorized_minter: Name.from(params.authorizedMinter),
                collection_name: Name.from(params.collectionName),
                schema_name: Name.from(params.schemaName),
                template_id: params.templateId,
                new_asset_owner: Name.from(params.newAssetOwner),
                immutable_data: params.immutableData,
                mutable_data: [],
                tokens_to_back: [],
            },
        },
        MINTASSET_ABI
    )
}

export interface AtomicAssetRow {
    asset_id: string
    collection_name: string
    schema_name: string
    template_id: number
    ram_payer?: string
    backed_tokens?: string[]
    immutable_serialized_data: string | number[]
    mutable_serialized_data?: string | number[]
}

export interface AtomicSchemaRow {
    schema_name: string
    format: SchemaField[]
}

export interface FetchAssetsOptions {
    collection?: NameType
    pageSize?: number
}

export async function fetchAtomicAssetsForOwner(
    client: APIClient,
    owner: NameType,
    opts: FetchAssetsOptions = {}
): Promise<AtomicAssetRow[]> {
    const collection = opts.collection ? String(Name.from(opts.collection)) : undefined
    const pageSize = opts.pageSize ?? 1000
    const out: AtomicAssetRow[] = []
    let lower: UInt64 | undefined
    while (true) {
        const res = await client.v1.chain.get_table_rows({
            code: Name.from(ATOMICASSETS_ACCOUNT),
            scope: String(Name.from(owner)),
            table: Name.from('assets'),
            limit: pageSize,
            lower_bound: lower,
            json: true,
        })
        for (const row of res.rows as AtomicAssetRow[]) {
            if (!collection || row.collection_name === collection) out.push(row)
        }
        if (!res.more) break
        lower = UInt64.from(String(res.next_key))
    }
    return out
}

export async function fetchAtomicSchemas(
    client: APIClient,
    collection: NameType
): Promise<AtomicSchemaRow[]> {
    const out: AtomicSchemaRow[] = []
    let lower: Name | undefined
    while (true) {
        const res = await client.v1.chain.get_table_rows({
            code: Name.from(ATOMICASSETS_ACCOUNT),
            scope: String(Name.from(collection)),
            table: Name.from('schemas'),
            limit: 100,
            lower_bound: lower,
            json: true,
        })
        for (const row of res.rows as AtomicSchemaRow[]) out.push(row)
        if (!res.more) break
        lower = Name.from(String(res.next_key))
    }
    return out
}

export interface DecodedAtomicAsset {
    asset_id: bigint
    schema_name: string
    template_id: number
    item_id: number
    quantity: number
    stats: string
    origin_x: bigint
    origin_y: bigint
    modules?: NFTModuleSlot[]
}

export function decodeAtomicAsset(
    asset: AtomicAssetRow,
    schemaFormat: SchemaField[],
    itemId: number
): DecodedAtomicAsset {
    const data = deserializeAtomicData(asset.immutable_serialized_data, schemaFormat)
    const cargo: NFTCargoItem = deserializeAsset(data, itemId)
    return {
        asset_id: BigInt(String(asset.asset_id)),
        schema_name: String(asset.schema_name),
        template_id: Number(asset.template_id),
        item_id: cargo.item_id,
        quantity: cargo.quantity,
        stats: cargo.stats,
        origin_x: BigInt(String(data.origin_x ?? 0)),
        origin_y: BigInt(String(data.origin_y ?? 0)),
        modules: cargo.modules,
    }
}
