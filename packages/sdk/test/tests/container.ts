import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {UInt64} from '@wharfkit/antelope'
import {makeContainer, ServerContract} from '$lib'

function makeStationaryContainer() {
    return makeContainer({
        id: UInt64.from(1),
        owner: 'teamgreymass',
        name: 'Test Container',
        coordinates: {x: 5, y: 10, z: 1000},
        hullmass: 50000,
        capacity: 500000,
    })
}

function makeContainerWithCargo() {
    return makeContainer({
        id: UInt64.from(2),
        owner: 'teamgreymass',
        name: 'Loaded Container',
        coordinates: {x: 5, y: 10, z: 1000},
        hullmass: 50000,
        capacity: 500000,
        cargomass: 100000,
    })
}

function makeContainerWithSchedule() {
    return makeContainer({
        id: UInt64.from(3),
        owner: 'teamgreymass',
        name: 'Container With Schedule',
        coordinates: {x: 0, y: 0, z: 1200},
        hullmass: 50000,
        capacity: 500000,
        schedule: ServerContract.Types.schedule.from({
            started: '2024-06-04T23:41:09.000',
            tasks: [
                ServerContract.Types.task.from({
                    type: 0,
                    duration: 100,
                    cancelable: 0,
                    cargo: [],
                }),
            ],
        }),
    })
}

describe('Container', () => {
    describe('fromState', () => {
        test('creates container with basic properties', () => {
            const container = makeStationaryContainer()
            assert.isTrue(container.id.equals(1))
            assert.isTrue(container.owner.equals('teamgreymass'))
            assert.equal(container.name, 'Test Container')
            assert.isTrue(container.type.equals('container'))
        })

        test('creates container with cargo mass', () => {
            const container = makeContainerWithCargo()
            assert.isTrue(container.cargomass.equals(100000))
        })
    })

    describe('sched.hasSchedule', () => {
        test('returns false when container has no schedule', () => {
            const container = makeStationaryContainer()
            assert.isFalse(container.sched.hasSchedule)
        })

        test('returns true when container has schedule with tasks', () => {
            const container = makeContainerWithSchedule()
            assert.isTrue(container.sched.hasSchedule)
        })
    })

    describe('isIdle', () => {
        test('returns true when container has no schedule', () => {
            const container = makeStationaryContainer()
            assert.isTrue(container.isIdle)
        })

        test('returns false when container has schedule', () => {
            const container = makeContainerWithSchedule()
            assert.isFalse(container.isIdle)
        })
    })

    describe('location', () => {
        test('returns Location object', () => {
            const container = makeStationaryContainer()
            const loc = container.location
            assert.equal(loc.coordinates.x.toNumber(), 5)
            assert.equal(loc.coordinates.y.toNumber(), 10)
        })
    })

    describe('orbitalAltitude', () => {
        test('returns z coordinate', () => {
            const container = makeStationaryContainer()
            assert.equal(container.orbitalAltitude, 1000)
        })

        test('returns 0 when z is undefined', () => {
            const container = makeContainer({
                id: UInt64.from(1),
                owner: 'teamgreymass',
                name: 'Test Container',
                coordinates: {x: 5, y: 10},
                hullmass: 50000,
                capacity: 500000,
            })
            assert.equal(container.orbitalAltitude, 0)
        })
    })

    describe('totalMass', () => {
        test('returns hullmass when no cargo', () => {
            const container = makeStationaryContainer()
            assert.isTrue(container.totalMass.equals(50000))
        })

        test('includes cargo mass', () => {
            const container = makeContainerWithCargo()
            assert.isTrue(container.totalMass.equals(150000))
        })
    })

    describe('maxCapacity', () => {
        test('returns capacity', () => {
            const container = makeStationaryContainer()
            assert.equal(container.maxCapacity.toNumber(), 500000)
        })
    })

    describe('availableCapacity', () => {
        test('returns full capacity when empty', () => {
            const container = makeStationaryContainer()
            assert.equal(container.availableCapacity.toNumber(), 500000)
        })

        test('returns reduced capacity when cargo loaded', () => {
            const container = makeContainerWithCargo()
            assert.equal(container.availableCapacity.toNumber(), 400000)
        })
    })

    describe('hasSpace', () => {
        test('returns true when space available', () => {
            const container = makeStationaryContainer()
            assert.isTrue(container.hasSpace(UInt64.from(100000)))
        })

        test('returns false when no space', () => {
            const container = makeStationaryContainer()
            assert.isFalse(container.hasSpace(UInt64.from(1000000)))
        })
    })

    describe('isFull', () => {
        test('returns false when not full', () => {
            const container = makeStationaryContainer()
            assert.isFalse(container.isFull)
        })

        test('returns true when at capacity', () => {
            const container = makeContainer({
                id: UInt64.from(1),
                owner: 'teamgreymass',
                name: 'Full Container',
                coordinates: {x: 5, y: 10},
                hullmass: 50000,
                capacity: 500000,
                cargomass: 500000,
            })
            assert.isTrue(container.isFull)
        })
    })

    describe('coordinates', () => {
        test('returns raw coordinates from entity', () => {
            const container = makeStationaryContainer()
            assert.equal(container.coordinates.x.toNumber(), 5)
            assert.equal(container.coordinates.y.toNumber(), 10)
        })
    })

    describe('schedule methods', () => {
        test('sched.duration returns total task duration', () => {
            const container = makeContainerWithSchedule()
            assert.equal(container.sched.duration(), 100)
        })

        test('sched.duration returns 0 when no schedule', () => {
            const container = makeStationaryContainer()
            assert.equal(container.sched.duration(), 0)
        })

        test('sched.elapsed calculates elapsed time', () => {
            const container = makeContainerWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(container.sched.elapsed(now), 50)
        })

        test('sched.remaining calculates remaining time', () => {
            const container = makeContainerWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(container.sched.remaining(now), 50)
        })

        test('sched.complete returns false when not complete', () => {
            const container = makeContainerWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.isFalse(container.sched.complete(now))
        })

        test('sched.complete returns true when complete', () => {
            const container = makeContainerWithSchedule()
            const now = new Date('2024-06-04T23:45:00.000Z')
            assert.isTrue(container.sched.complete(now))
        })

        test('sched.currentTaskIndex returns correct task', () => {
            const container = makeContainerWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(container.sched.currentTaskIndex(now), 0)
        })

        test('sched.currentTaskIndex returns -1 when no schedule', () => {
            const container = makeStationaryContainer()
            const now = new Date()
            assert.equal(container.sched.currentTaskIndex(now), -1)
        })

        test('sched.currentTaskIndex returns -1 when schedule is past completion', () => {
            const container = makeContainerWithSchedule()
            const now = new Date('2024-06-04T23:45:00.000Z')
            assert.equal(container.sched.currentTaskIndex(now), -1)
        })
    })
})
