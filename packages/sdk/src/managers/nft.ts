import {UInt64, type UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import type {ServerContract} from '../contracts'

export interface NftConfigForItem {
    templateId: number
    schemaName: string
}

export class NftManager extends BaseManager {
    private cache = new Map<string, NftConfigForItem | null>()

    async getNftConfigForItem(itemId: UInt64Type): Promise<NftConfigForItem | undefined> {
        const id = UInt64.from(itemId)
        const key = id.toString()
        if (this.cache.has(key)) {
            return this.cache.get(key) ?? undefined
        }
        const row = (await this.server.table('nftconfig').get(id)) as
            | ServerContract.Types.nftconfig_row
            | undefined
        const result: NftConfigForItem | null = row
            ? {templateId: Number(row.template_id), schemaName: String(row.schema_name)}
            : null
        this.cache.set(key, result)
        return result ?? undefined
    }
}
