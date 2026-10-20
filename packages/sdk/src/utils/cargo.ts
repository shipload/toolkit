import {UInt64} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'

const ITEM_SHIFT = 20n
const ENTITY_SHIFT = 36n

export function cargoRowEntityId(row: {id: UInt64}): UInt64 {
    return UInt64.from(BigInt(row.id.toString()) >> ENTITY_SHIFT)
}

export function cargoRowItemId(row: {id: UInt64}): number {
    return Number((BigInt(row.id.toString()) >> ITEM_SHIFT) & 0xffffn)
}

export function cargoStackFloor(entityId: bigint | number | UInt64, itemId: number): bigint {
    return (BigInt(entityId.toString()) << ENTITY_SHIFT) | (BigInt(itemId) << ITEM_SHIFT)
}

export function cargoRef(src: {
    item_id: number
    stats: bigint | number
    modules?: ServerContract.Types.module_entry[]
    entity_id?: bigint | number
}): ServerContract.ActionParams.Type.cargo_ref {
    return {
        item_id: src.item_id,
        stats: src.stats,
        modules: src.modules ?? [],
        entity_id: src.entity_id,
    }
}

export function cargoItem(
    src: {
        item_id: number
        stats: bigint | number
        modules?: ServerContract.Types.module_entry[]
    },
    quantity: bigint | number
): ServerContract.ActionParams.Type.cargo_item {
    return {
        ...cargoRef(src),
        quantity,
    }
}
