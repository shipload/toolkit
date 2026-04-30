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
    | 'storage'
    | 'hauler'
    | 'warp'
    | 'ship-t1'
    | 'container-t1'
    | 'warehouse-t1'
    | 'container-t2'

const ENTITY_HULL_SLOTS: Record<number, SlotConsumer> = {
    0: {capability: 'Storage', attribute: 'capacity'},
    1: {capability: 'Hull', attribute: 'mass'},
    2: {capability: 'Storage', attribute: 'capacity'},
    3: {capability: 'Storage', attribute: 'capacity'},
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
        3: {capability: 'Gathering', attribute: 'drain'},
        4: {capability: 'Gathering', attribute: 'speed'},
    },
    loader: {
        0: {capability: 'Loader', attribute: 'mass'},
        1: {capability: 'Loader', attribute: 'thrust'},
    },
    crafter: {
        0: {capability: 'Crafter', attribute: 'speed'},
        1: {capability: 'Crafter', attribute: 'drain'},
    },
    storage: {
        0: {capability: 'Storage', attribute: 'bonus'},
        1: {capability: 'Storage', attribute: 'bonus'},
        2: {capability: 'Storage', attribute: 'bonus'},
        3: {capability: 'Storage', attribute: 'bonus'},
    },
    hauler: {
        0: {capability: 'Hauler', attribute: 'capacity'},
        1: {capability: 'Hauler', attribute: 'efficiency'},
        2: {capability: 'Hauler', attribute: 'drain'},
    },
    warp: {
        0: {capability: 'Warp', attribute: 'range'},
    },
    'ship-t1': ENTITY_HULL_SLOTS,
    'container-t1': ENTITY_HULL_SLOTS,
    'warehouse-t1': ENTITY_HULL_SLOTS,
    'container-t2': ENTITY_HULL_SLOTS,
}
