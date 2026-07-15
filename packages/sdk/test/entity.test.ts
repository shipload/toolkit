import {describe, expect, test} from 'bun:test'
import kindRegistry from '../src/data/kind-registry.json'
import {
    EntityClass,
    getEntityClass,
    getKindMeta,
    isContainer,
    isExtractor,
    isFactory,
    isConstructionDock,
    isHub,
    isMassCatcher,
    isMassDriver,
    isNexus,
    isPlot,
    isShip,
    isWarehouse,
    isWorkshop,
} from '../src/data/kind-registry'
import {Entity} from '../src/entities/entity'
import {rollupCrafter, rollupGatherer, rollupLoaders} from '../src/derivation/rollups'
import {ServerContract} from '../src/contracts'
import {makeEntity} from '../src/entities/makers'
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONSTRUCTION_DOCK_T1_PACKED,
    ITEM_EXTRACTOR_T1_PACKED,
    ITEM_FACTORY_T1_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '../src/data/item-ids'

const PREDICATE_BY_KIND: Record<string, (e: {type?: any}) => boolean> = {
    ship: isShip,
    warehouse: isWarehouse,
    extractor: isExtractor,
    factory: isFactory,
    builddock: isConstructionDock,
    workshop: isWorkshop,
    container: isContainer,
    nexus: isNexus,
    plot: isPlot,
    mdriver: isMassDriver,
    mcatcher: isMassCatcher,
    hub: isHub,
}

const PACKED_ITEM_BY_KIND: Record<string, number | undefined> = {
    ship: ITEM_SHIP_T1_PACKED,
    warehouse: ITEM_WAREHOUSE_T1_PACKED,
    extractor: ITEM_EXTRACTOR_T1_PACKED,
    factory: ITEM_FACTORY_T1_PACKED,
    builddock: ITEM_CONSTRUCTION_DOCK_T1_PACKED,
    container: ITEM_CONTAINER_T1_PACKED,
    nexus: undefined,
}

const baseState = {
    id: 1n,
    owner: 'alice',
    name: 'Test',
    coordinates: {x: 0, y: 0},
}

describe('Entity unification — registry-driven', () => {
    describe('kind traits', () => {
        for (const k of kindRegistry.kinds) {
            test(`${k.kind}: getEntityClass returns a valid class`, () => {
                const cls = getEntityClass(k.kind)
                expect([
                    EntityClass.OrbitalVessel,
                    EntityClass.PlanetaryStructure,
                    EntityClass.Plot,
                    EntityClass.OrbitalStructure,
                ]).toContain(cls)
            })

            test(`${k.kind}: getKindMeta resolves`, () => {
                const meta = getKindMeta(k.kind)
                expect(meta).toBeDefined()
                expect(meta!.kind.toString()).toBe(k.kind)
            })

            test(`${k.kind}: predicate matches`, () => {
                const predicate = PREDICATE_BY_KIND[k.kind]
                expect(predicate, `no predicate registered for ${k.kind}`).toBeDefined()
                const meta = getKindMeta(k.kind)!
                expect(predicate({type: meta.kind})).toBeTrue()
            })
        }
    })

    describe('makeEntity per kind', () => {
        for (const k of kindRegistry.kinds) {
            const packed = PACKED_ITEM_BY_KIND[k.kind]
            if (packed === undefined) continue

            test(`${k.kind}: makeEntity produces matching kind`, () => {
                const e = makeEntity(packed, {
                    id: 1n,
                    owner: 'alice',
                    name: `Test ${k.kind}`,
                    coordinates: {x: 0, y: 0},
                })
                expect(e).toBeInstanceOf(Entity)
                expect(e.type.toString()).toBe(k.kind)
            })
        }
    })

    describe('makeEntity rejects unknown templates', () => {
        test('throws for unknown packed item IDs', () => {
            expect(() => makeEntity(99999, baseState)).toThrow()
        })
    })

    describe('EntityTypeName drift detection', () => {
        test('every kind in kind-registry.json is in PREDICATE_BY_KIND', () => {
            for (const k of kindRegistry.kinds) {
                expect(
                    PREDICATE_BY_KIND[k.kind],
                    `EntityTypeName missing for ${k.kind}`
                ).toBeDefined()
            }
        })
    })

    describe('derived capability getters clamp at uint16 max', () => {
        function shipWithLanes(lanes: {
            loaders?: {slot_index: number; mass: number; thrust: number}[]
            crafters?: {slot_index: number; speed: number; drain: number}[]
            builders?: {slot_index: number; speed: number; drain: number}[]
            gatherers?: {slot_index: number; yield: number; drain: number; depth: number}[]
        }) {
            return ServerContract.Types.entity_info.from({
                id: 1n,
                type: 'ship',
                item_id: 1000,
                owner: 'alice',
                entity_name: '',
                cargomass: 0,
                cargo: [],
                coordinates: {x: 0, y: 0},
                is_idle: true,
                current_task_elapsed: 0,
                current_task_remaining: 0,
                pending_tasks: [],
                lanes: [],
                gatherer_lanes: (lanes.gatherers ?? []).map((l) => ({...l, output_pct: 100})),
                crafter_lanes: (lanes.crafters ?? []).map((l) => ({...l, output_pct: 100})),
                builder_lanes: (lanes.builders ?? []).map((l) => ({...l, output_pct: 100})),
                loader_lanes: (lanes.loaders ?? []).map((l) => ({...l, output_pct: 100})),
                holds: [],
                modules: [],
            }) as unknown as Entity
        }

        test('loaders.thrust clamps when two lanes sum past 65535', () => {
            const e = Object.setPrototypeOf(
                shipWithLanes({
                    loaders: [
                        {slot_index: 0, mass: 1000, thrust: 40000},
                        {slot_index: 1, mass: 1000, thrust: 40000},
                    ],
                }),
                Entity.prototype
            ) as Entity
            const loaders = rollupLoaders(e.loader_lanes)!
            expect(Number(loaders.thrust)).toBe(65535)
            expect(Number(loaders.quantity)).toBe(2)
        })

        test('crafter.speed clamps when two lanes sum past 65535', () => {
            const e = Object.setPrototypeOf(
                shipWithLanes({
                    crafters: [
                        {slot_index: 0, speed: 40000, drain: 10},
                        {slot_index: 1, speed: 40000, drain: 10},
                    ],
                }),
                Entity.prototype
            ) as Entity
            expect(Number(rollupCrafter(e.crafter_lanes)!.speed)).toBe(65535)
        })

        test('gatherer.yield clamps when two lanes sum past 65535', () => {
            const e = Object.setPrototypeOf(
                shipWithLanes({
                    gatherers: [
                        {slot_index: 0, yield: 40000, drain: 10, depth: 500},
                        {slot_index: 1, yield: 40000, drain: 10, depth: 900},
                    ],
                }),
                Entity.prototype
            ) as Entity
            const gatherer = rollupGatherer(e.gatherer_lanes)!
            expect(Number(gatherer.yield)).toBe(65535)
            expect(Number(gatherer.depth)).toBe(900)
        })
    })
})
