export interface SlotConsumer {
    capability: string
    attribute: string
}

export type SlotConsumerKind =
    | 'engine'
    | 'generator'
    | 'gatherer'
    | 'loader'
    | 'crafter'
    | 'builder'
    | 'storage'
    | 'hauler'
    | 'warp'
    | 'battery'
    | 'ship-t1'
    | 'container-t1'
    | 'warehouse-t1'
    | 'extractor-t1'
    | 'container-t2'

const ENTITY_HULL_SLOTS: Record<number, SlotConsumer> = {
    0: {capability: 'Storage', attribute: 'capacity'},
    1: {capability: 'Hull', attribute: 'mass'},
    2: {capability: 'Storage', attribute: 'capacity'},
}

export const SLOT_FORMULAS: Record<SlotConsumerKind, Record<number, SlotConsumer>> = {
    engine: {
        0: {capability: 'Movement', attribute: 'thrust'},
        1: {capability: 'Movement', attribute: 'drain'},
    },
    generator: {
        0: {capability: 'Energy', attribute: 'capacity'},
        1: {capability: 'Energy', attribute: 'recharge'},
    },
    gatherer: {
        0: {capability: 'Gathering', attribute: 'yield'},
        1: {capability: 'Gathering', attribute: 'depth'},
        2: {capability: 'Gathering', attribute: 'drain'},
    },
    loader: {
        0: {capability: 'Loading', attribute: 'mass'},
        1: {capability: 'Loading', attribute: 'thrust'},
    },
    crafter: {
        0: {capability: 'Crafting', attribute: 'speed'},
        1: {capability: 'Crafting', attribute: 'drain'},
    },
    builder: {
        0: {capability: 'Build', attribute: 'speed'},
        1: {capability: 'Build', attribute: 'drain'},
    },
    storage: {
        0: {capability: 'Storage', attribute: 'capacity'},
        1: {capability: 'Storage', attribute: 'capacity'},
        2: {capability: 'Storage', attribute: 'capacity'},
        3: {capability: 'Storage', attribute: 'capacity'},
    },
    hauler: {
        0: {capability: 'Hauling', attribute: 'capacity'},
        1: {capability: 'Hauling', attribute: 'efficiency'},
        2: {capability: 'Hauling', attribute: 'drain'},
    },
    warp: {
        0: {capability: 'Warp', attribute: 'range'},
    },
    battery: {
        0: {capability: 'Energy', attribute: 'capacity'},
        1: {capability: 'Energy', attribute: 'capacity'},
        2: {capability: 'Energy', attribute: 'capacity'},
        3: {capability: 'Energy', attribute: 'capacity'},
    },
    'ship-t1': ENTITY_HULL_SLOTS,
    'container-t1': ENTITY_HULL_SLOTS,
    'warehouse-t1': ENTITY_HULL_SLOTS,
    'extractor-t1': ENTITY_HULL_SLOTS,
    'container-t2': ENTITY_HULL_SLOTS,
}
