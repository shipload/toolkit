import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {makeNexus, Nexus} from '$lib'

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
