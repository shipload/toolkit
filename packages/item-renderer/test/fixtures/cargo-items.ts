import {ServerContract} from '@shipload/sdk'

export const ITEM_ORE_T1 = 101
export const ITEM_GAS_T2 = 302
export const ITEM_ENGINE_T1 = 10100
export const ITEM_GENERATOR_T1 = 10101
export const ITEM_GATHERER_T1 = 10102
export const ITEM_LOADER_T1 = 10103
export const ITEM_MANUFACTURING_T1 = 10104
export const ITEM_STORAGE_T1 = 10105
export const ITEM_HAULER_T1 = 10106
export const ITEM_SHIP_T1_PACKED = 10201

export const MODULE_ENGINE = 1
export const MODULE_GENERATOR = 2

export function cargoOreT1(stats = '0x123456789ABCDEF', quantity = 1) {
    return ServerContract.Types.cargo_item.from({
        item_id: ITEM_ORE_T1,
        quantity,
        stats,
        modules: [],
    })
}

export function cargoShipT1Packed(opts?: {
    stats?: string
    engineStats?: string
    generatorStats?: string
    onlyEngine?: boolean
}) {
    const o = opts ?? {}
    const modules: unknown[] = []
    modules.push({
        type: MODULE_ENGINE,
        installed: {item_id: ITEM_ENGINE_T1, stats: o.engineStats ?? '0x2A4F6B8C'},
    })
    if (!o.onlyEngine) {
        modules.push({
            type: MODULE_GENERATOR,
            installed: {item_id: ITEM_GENERATOR_T1, stats: o.generatorStats ?? '0x1B2D4F'},
        })
    }
    return ServerContract.Types.cargo_item.from({
        item_id: ITEM_SHIP_T1_PACKED,
        quantity: 1,
        stats: o.stats ?? '0',
        modules,
    })
}

export const ITEM_HULL_PLATES = 10001

export const FIXTURES = {
    oreT1: cargoOreT1('0x123456789ABCDEF'),
    oreT1StackOf50: cargoOreT1('0x123456789ABCDEF', 50),
    oreT1ZeroStats: cargoOreT1('0'),
    gasT2: ServerContract.Types.cargo_item.from({
        item_id: ITEM_GAS_T2,
        quantity: 1,
        stats: '0xDEADBEEF1234',
        modules: [],
    }),
    hullPlates: ServerContract.Types.cargo_item.from({
        item_id: ITEM_HULL_PLATES,
        quantity: 1,
        stats: '0x7FFF',
        modules: [],
    }),
    engineT1: ServerContract.Types.cargo_item.from({
        item_id: ITEM_ENGINE_T1,
        quantity: 1,
        stats: '358800',
        modules: [],
    }),
    generatorT1: ServerContract.Types.cargo_item.from({
        item_id: ITEM_GENERATOR_T1,
        quantity: 1,
        stats: '683908',
        modules: [],
    }),
    gathererT1: ServerContract.Types.cargo_item.from({
        item_id: ITEM_GATHERER_T1,
        quantity: 1,
        stats: '138255128433040',
        modules: [],
    }),
    loaderT1: ServerContract.Types.cargo_item.from({
        item_id: ITEM_LOADER_T1,
        quantity: 1,
        stats: '512750',
        modules: [],
    }),
    crafterT1: ServerContract.Types.cargo_item.from({
        item_id: ITEM_MANUFACTURING_T1,
        quantity: 1,
        stats: '512600',
        modules: [],
    }),
    storageT1: ServerContract.Types.cargo_item.from({
        item_id: ITEM_STORAGE_T1,
        quantity: 1,
        stats: '537605632700',
        modules: [],
    }),
    haulerT1: ServerContract.Types.cargo_item.from({
        item_id: ITEM_HAULER_T1,
        quantity: 1,
        stats: '0x3E8',
        modules: [],
    }),
    shipT1NoModules: ServerContract.Types.cargo_item.from({
        item_id: ITEM_SHIP_T1_PACKED,
        quantity: 1,
        stats: '0',
        modules: [],
    }),
    shipT1TwoModules: cargoShipT1Packed(),
    shipT1OnlyEngine: cargoShipT1Packed({onlyEngine: true}),
} as const

export type FixtureName = keyof typeof FIXTURES
