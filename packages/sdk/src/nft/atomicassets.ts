import {type APIClient, Name, type NameType, UInt64} from '@wharfkit/antelope'
import {deserializeAtomicData, type SchemaField} from './atomicdata'
import {deserializeAsset, type NFTCargoItem, type NFTModuleSlot} from './deserializers'

export const ATOMICASSETS_ACCOUNT = 'atomicassets'
export const SHIPLOAD_COLLECTION = 'shipload'

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
