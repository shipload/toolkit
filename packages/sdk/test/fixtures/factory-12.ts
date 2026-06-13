import {ITEM_CRAFTER_T1, ITEM_GENERATOR_T1, ServerContract, TaskType} from '../../src'

// Live factory:12 mid-batch capture: four elapsed-but-unsettled crafts plus a 163-unit craft in progress.
const CARGO = [
    {item_id: 101, quantity: 46, stats: 131408152, modules: []},
    {item_id: 101, quantity: 23, stats: 512775321, modules: []},
    {item_id: 101, quantity: 1900, stats: 458292414, modules: []},
    {item_id: 201, quantity: 3600, stats: 316058715, modules: []},
    {item_id: 101, quantity: 1400, stats: 227964179, modules: []},
]

function craftTask(duration: number, cargo: {item_id: number; stats: number; quantity: number}[]) {
    return {
        type: TaskType.CRAFT,
        duration,
        cancelable: 2,
        coordinates: null,
        cargo: cargo.map((c) => ({...c, modules: [], entity_id: null})),
        entitytarget: null,
        entitygroup: null,
        energy_cost: null,
    }
}

const RESONATOR = {item_id: 10004, stats: 308651}

const CRAFTER_LANE = {
    lane_key: 2,
    schedule: {
        started: '2026-06-11T17:06:38.000',
        tasks: [
            craftTask(55, [
                {item_id: 201, stats: 316058715, quantity: 6},
                {item_id: 101, stats: 458292414, quantity: 9},
                {...RESONATOR, quantity: 1},
            ]),
            craftTask(55, [
                {item_id: 201, stats: 316058715, quantity: 6},
                {item_id: 101, stats: 458292414, quantity: 9},
                {...RESONATOR, quantity: 1},
            ]),
            craftTask(55, [
                {item_id: 201, stats: 316058715, quantity: 6},
                {item_id: 101, stats: 458292414, quantity: 9},
                {...RESONATOR, quantity: 1},
            ]),
            craftTask(11555, [
                {item_id: 201, stats: 316058715, quantity: 1248},
                {item_id: 101, stats: 458292414, quantity: 1872},
                {...RESONATOR, quantity: 208},
            ]),
            craftTask(9055, [
                {item_id: 201, stats: 316058715, quantity: 978},
                {item_id: 101, stats: 458292414, quantity: 1},
                {item_id: 101, stats: 227964179, quantity: 1400},
                {item_id: 101, stats: 131408152, quantity: 46},
                {item_id: 101, stats: 512775321, quantity: 20},
                {...RESONATOR, quantity: 163},
            ]),
        ],
    },
}

const BARRIER_LANE = {
    lane_key: 255,
    schedule: {
        started: '2026-06-11T16:05:54.000',
        tasks: [
            {
                type: 2,
                duration: 240,
                cancelable: 2,
                coordinates: null,
                cargo: [],
                entitytarget: null,
                entitygroup: null,
                energy_cost: null,
            },
        ],
    },
}

// Incoming 1824 Ore: idle until the carrier docks, then load — lands 23:02:57, after the crafter frees.
const INCOMING_LOAD_LANE = {
    lane_key: 0,
    schedule: {
        started: '2026-06-11T21:52:02.000',
        tasks: [
            {
                type: TaskType.IDLE,
                duration: 3651,
                cancelable: 2,
                coordinates: null,
                cargo: [],
                entitytarget: null,
                entitygroup: null,
                energy_cost: null,
            },
            {
                type: TaskType.LOAD,
                duration: 604,
                cancelable: 2,
                coordinates: null,
                cargo: [
                    {item_id: 101, stats: 458292414, modules: [], quantity: 1824, entity_id: null},
                ],
                entitytarget: null,
                entitygroup: null,
                energy_cost: null,
            },
        ],
    },
}

const MODULES = [
    {type: 0, installed: {item_id: ITEM_GENERATOR_T1, stats: 218325}},
    {type: 0, installed: {item_id: ITEM_CRAFTER_T1, stats: 218325}},
]

export const FACTORY_12_NOW = new Date('2026-06-11T20:58:10.000Z')
export const FACTORY_12_AT = new Date('2026-06-11T23:30:00.000Z')
export const FACTORY_12_CRAFTER_SPEED = 270

export function factory12(opts?: {incomingLoad?: boolean}) {
    return {
        cargo: CARGO.map((c) => ServerContract.Types.cargo_item.from(c)),
        modules: MODULES.map((m) => ServerContract.Types.module_entry.from(m)),
        lanes: [
            ServerContract.Types.lane.from(CRAFTER_LANE),
            ServerContract.Types.lane.from(BARRIER_LANE),
            ...(opts?.incomingLoad ? [ServerContract.Types.lane.from(INCOMING_LOAD_LANE)] : []),
        ],
    }
}
