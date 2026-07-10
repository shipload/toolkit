import {describe, expect, test} from 'bun:test'
import {ServerContract} from '../src/contracts'
import {
    projectedCargoAvailableAt,
    availableForItem,
    cargoReadyAt,
} from '../src/scheduling/availability'
import {factory12, FACTORY_12_AT} from './fixtures/factory-12'

const CARGO = [
    {item_id: 501, quantity: 46, stats: 131408152, modules: []},
    {item_id: 501, quantity: 23, stats: 512775321, modules: []},
    {item_id: 501, quantity: 1900, stats: 458292414, modules: []},
    {item_id: 201, quantity: 3600, stats: 316058715, modules: []},
    {item_id: 501, quantity: 1400, stats: 227964179, modules: []},
]

const PENDING_CRAFT_LANE = {
    lane_key: 2,
    schedule: {
        started: '2026-06-11T17:06:38.000',
        tasks: [
            {
                type: 7,
                duration: 55,
                cancelable: 2,
                coordinates: null,
                cargo: [
                    {item_id: 201, stats: 316058715, modules: [], quantity: 6, entity_id: null},
                    {item_id: 501, stats: 458292414, modules: [], quantity: 9, entity_id: null},
                    {item_id: 10004, stats: 308651, modules: [], quantity: 1, entity_id: null},
                ],
                couplings: [],
                entitygroup: null,
                energy_cost: null,
            },
        ],
    },
}

function fixture(pendingCraft: boolean) {
    return {
        cargo: CARGO.map((c) => ServerContract.Types.cargo_item.from(c)),
        lanes: [
            ...(pendingCraft ? [ServerContract.Types.lane.from(PENDING_CRAFT_LANE)] : []),
            ServerContract.Types.lane.from({
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
                            couplings: [],
                            entitygroup: null,
                            energy_cost: null,
                        },
                    ],
                },
            }),
        ],
    }
}

const NOW = new Date('2026-06-11T17:06:40.000Z')
const AT = new Date('2026-06-11T17:30:00.000Z')

describe('projectedCargoAvailableAt', () => {
    test('without a pending craft, availability equals raw cargo', () => {
        const avail = projectedCargoAvailableAt(fixture(false), AT)
        expect(availableForItem(avail, 501)).toBe(3369n)
        expect(availableForItem(avail, 201)).toBe(3600n)
    })

    test('subtracts the pending craft inputs (9x 501 reserved, 6x 201 reserved)', () => {
        const avail = projectedCargoAvailableAt(fixture(true), AT)
        expect(availableForItem(avail, 501)).toBe(3360n)
        expect(avail.get('501:458292414')).toBe(1891n)
        expect(availableForItem(avail, 201)).toBe(3594n)
        expect(availableForItem(avail, 10004)).toBe(1n)
    })

    test('with at before the pending craft completes, its output is NOT credited', () => {
        const justAfterNow = new Date(NOW.getTime() + 1000)
        const avail = projectedCargoAvailableAt(fixture(true), justAfterNow)
        expect(availableForItem(avail, 10004)).toBe(0n)
        expect(availableForItem(avail, 501)).toBe(3360n)
    })

    test('keeps packed entity identities distinct when item and stats match', () => {
        const avail = projectedCargoAvailableAt(
            {
                cargo: [
                    ServerContract.Types.cargo_item.from({
                        item_id: 10201,
                        stats: 123,
                        modules: [],
                        quantity: 1,
                        entity_id: 42,
                    }),
                    ServerContract.Types.cargo_item.from({
                        item_id: 10201,
                        stats: 123,
                        modules: [],
                        quantity: 2,
                        entity_id: 43,
                    }),
                ],
                lanes: [],
            },
            AT
        )

        expect(availableForItem(avail, 10201)).toBe(3n)
        expect([...avail.values()].sort()).toEqual([1n, 2n])
    })

    test('credits undeploy outputs completing before at', () => {
        const avail = projectedCargoAvailableAt(
            {
                cargo: [],
                lanes: [
                    ServerContract.Types.lane.from({
                        lane_key: 255,
                        schedule: {
                            started: '2026-06-11T17:06:38.000',
                            tasks: [
                                {
                                    type: 11,
                                    duration: 55,
                                    cancelable: 2,
                                    coordinates: null,
                                    cargo: [
                                        {
                                            item_id: 10201,
                                            stats: 123,
                                            modules: [],
                                            quantity: 1,
                                            entity_id: 42,
                                        },
                                    ],
                                    couplings: [],
                                    entitygroup: null,
                                    energy_cost: null,
                                },
                            ],
                        },
                    }),
                ],
            },
            AT
        )

        expect(availableForItem(avail, 10201)).toBe(1n)
    })

    test('subtracts completed-but-unsettled craft inputs (the unsettled cargo base)', () => {
        const avail = projectedCargoAvailableAt(factory12(), FACTORY_12_AT)
        expect(availableForItem(avail, 201)).toBe(1356n)
        expect(availableForItem(avail, 101)).toBe(3n)
        expect(availableForItem(avail, 10004)).toBe(374n)
    })

    test('credits an in-transit load once the craft completes after it lands', () => {
        const entity = factory12({incomingLoad: true})
        // The 1824 Ore load lands at 23:02:57.
        const beforeLoad = new Date('2026-06-11T23:00:00.000Z')
        const afterLoad = new Date('2026-06-11T23:05:00.000Z')
        expect(availableForItem(projectedCargoAvailableAt(entity, beforeLoad), 101)).toBe(3n)
        expect(availableForItem(projectedCargoAvailableAt(entity, afterLoad), 101)).toBe(1827n)
    })
})

describe('cargoReadyAt', () => {
    test('returns epoch when no scheduled task produces the inputs', () => {
        expect(cargoReadyAt(factory12(), [201, 101]).getTime()).toBe(0)
    })

    test('returns the latest completion of a task producing a required input', () => {
        const ready = cargoReadyAt(factory12({incomingLoad: true}), [201, 101])
        expect(ready.toISOString()).toBe('2026-06-11T23:02:57.000Z')
    })
})
