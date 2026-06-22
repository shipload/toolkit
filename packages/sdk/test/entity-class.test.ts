import {describe, expect, test} from 'bun:test'
import {Name, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {Entity} from '../src/entities/entity'
import {ServerContract} from '../src/contracts'
import {ENTITY_SHIP, ENTITY_NEXUS, EntityClass} from '../src/data/kind-registry'

function bareEntityInfo(
    overrides: Partial<Record<string, unknown>> = {}
): ServerContract.Types.entity_info {
    return ServerContract.Types.entity_info.from({
        id: UInt64.from(1),
        owner: Name.from('alice'),
        type: ENTITY_SHIP,
        entity_name: 'Test Ship',
        coordinates: ServerContract.Types.coordinates.from({x: 10, y: 20}),
        item_id: UInt16.from(0),
        is_idle: true,
        hullmass: UInt32.from(100),
        capacity: UInt32.from(5000),
        cargomass: UInt32.from(0),
        cargo: [],
        modules: [],
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
        lanes: [],
        gatherer_lanes: [],
        crafter_lanes: [],
        loader_lanes: [],
        holds: [],
        ...overrides,
    })
}

function laneWithTask(laneKey: number) {
    return ServerContract.Types.lane.from({
        lane_key: laneKey,
        schedule: {
            started: '2026-06-02T10:00:00.000',
            tasks: [{type: 1, duration: 60, cancelable: 0, cargo: []}],
        },
    })
}

describe('Entity universal accessors', () => {
    test('name reads entity_name', () => {
        const e = new Entity(bareEntityInfo({entity_name: 'Beachcomber'}))
        expect(e.name).toBe('Beachcomber')
    })

    test('isIdle derives from scheduled work across all lanes', () => {
        expect(new Entity(bareEntityInfo()).isIdle).toBeTrue()
        expect(
            new Entity(bareEntityInfo({is_idle: true, lanes: [laneWithTask(4)]})).isIdle
        ).toBeFalse()
    })

    test('location wraps coordinates', () => {
        const e = new Entity(
            bareEntityInfo({
                coordinates: ServerContract.Types.coordinates.from({x: 7, y: 9}),
            })
        )
        expect(Number(e.location.coordinates.x)).toBe(7)
        expect(Number(e.location.coordinates.y)).toBe(9)
    })

    test('maxCapacity is UInt64 of capacity field', () => {
        const e = new Entity(bareEntityInfo({capacity: UInt32.from(5000)}))
        expect(e.maxCapacity.equals(UInt64.from(5000))).toBeTrue()
    })

    test('availableCapacity equals maxCapacity when no cargo', () => {
        const e = new Entity(bareEntityInfo({capacity: UInt32.from(5000)}))
        expect(e.availableCapacity.equals(UInt64.from(5000))).toBeTrue()
    })

    test('isFull is false on empty cargo', () => {
        const empty = new Entity(bareEntityInfo({capacity: UInt32.from(5000)}))
        expect(empty.isFull).toBeFalse()
    })

    test('totalMass adds hullmass and cargo mass', () => {
        const e = new Entity(
            bareEntityInfo({hullmass: UInt32.from(100), capacity: UInt32.from(5000)})
        )
        expect(e.totalMass.equals(UInt64.from(100))).toBeTrue()
    })
})

describe('Entity kind-derived flags', () => {
    test('ship has wrap/undeploy/modules but not demolish', () => {
        const ship = new Entity(bareEntityInfo({type: ENTITY_SHIP}))
        expect(ship.canWrap).toBeTrue()
        expect(ship.canUndeploy).toBeTrue()
        expect(ship.canUseModules).toBeTrue()
        expect(ship.canDemolish).toBeFalse()
        expect(ship.entityClass).toBe(EntityClass.OrbitalVessel)
    })

    test('nexus has no capabilities', () => {
        const nexus = new Entity(bareEntityInfo({type: ENTITY_NEXUS}))
        expect(nexus.canWrap).toBeFalse()
        expect(nexus.canUndeploy).toBeFalse()
        expect(nexus.canDemolish).toBeFalse()
        expect(nexus.canUseModules).toBeFalse()
        expect(nexus.entityClass).toBe(EntityClass.OrbitalVessel)
    })
})
