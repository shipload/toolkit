import type {ServerContract} from '../contracts'

export function cargoRef(src: {
    item_id: number
    stats: bigint | number
    modules?: ServerContract.Types.module_entry[]
}): ServerContract.ActionParams.Type.cargo_ref {
    return {
        item_id: src.item_id,
        stats: src.stats,
        modules: src.modules ?? [],
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
