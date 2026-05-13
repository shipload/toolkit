import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {UInt32, UInt64} from '@wharfkit/antelope'
import {Nexus, ServerContract} from '$lib'

function makeNexus(state: {
    id: number | bigint
    owner: string
    name: string
    coordinates: {x: number; y: number; z?: number}
}) {
    return new Nexus(
        ServerContract.Types.entity_info.from({
            type: 'nexus',
            id: UInt64.from(state.id),
            owner: state.owner,
            entity_name: state.name,
            coordinates: state.coordinates,
            cargomass: UInt32.from(0),
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: UInt32.from(0),
            current_task_remaining: UInt32.from(0),
            pending_tasks: [],
        })
    )
}

describe('Nexus', () => {
    test('makeNexus produces a Nexus instance', () => {
        const n = makeNexus({
            id: 7,
            owner: 'shipload.gm',
            name: 'Genesis Nexus',
            coordinates: {x: 0, y: 0, z: 800},
        })
        assert.instanceOf(n, Nexus)
    })

    test('name returns entity_name', () => {
        const n = makeNexus({
            id: 7,
            owner: 'shipload.gm',
            name: 'Genesis Nexus',
            coordinates: {x: 0, y: 0, z: 800},
        })
        assert.equal(n.name, 'Genesis Nexus')
    })

    test('entityClass is orbital', () => {
        const n = makeNexus({
            id: 7,
            owner: 'shipload.gm',
            name: 'Genesis Nexus',
            coordinates: {x: 0, y: 0, z: 800},
        })
        assert.equal(n.entityClass, 'orbital')
    })

    test('orbitalAltitude reflects z coordinate', () => {
        const n = makeNexus({
            id: 7,
            owner: 'shipload.gm',
            name: 'Genesis Nexus',
            coordinates: {x: 0, y: 0, z: 800},
        })
        assert.equal(n.orbitalAltitude, 800)
    })

    describe('location', () => {
        test('returns Location object', () => {
            const n = makeNexus({
                id: 7,
                owner: 'shipload.gm',
                name: 'Genesis Nexus',
                coordinates: {x: 12, y: -4, z: 800},
            })
            const loc = n.location
            assert.equal(loc.coordinates.x.toNumber(), 12)
            assert.equal(loc.coordinates.y.toNumber(), -4)
        })
    })
})
