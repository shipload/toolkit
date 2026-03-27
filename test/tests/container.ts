import {assert} from 'chai'
import {UInt64} from '@wharfkit/antelope'
import {makeContainer, ServerContract} from '$lib'

function makeStationaryContainer() {
    return makeContainer({
        id: 1,
        owner: 'teamgreymass',
        name: 'Test Container',
        coordinates: {x: 5, y: 10, z: 1000},
        hullmass: 50000,
        capacity: 500000,
    })
}

function makeContainerWithCargo() {
    return makeContainer({
        id: 2,
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
        id: 3,
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

suite('Container', function () {
    suite('fromState', function () {
        test('creates container with basic properties', function () {
            const container = makeStationaryContainer()
            assert.isTrue(container.id.equals(1))
            assert.isTrue(container.owner.equals('teamgreymass'))
            assert.equal(container.name, 'Test Container')
            assert.isTrue(container.type.equals('container'))
        })

        test('creates container with cargo mass', function () {
            const container = makeContainerWithCargo()
            assert.isTrue(container.cargomass.equals(100000))
        })
    })

    suite('sched.hasSchedule', function () {
        test('returns false when container has no schedule', function () {
            const container = makeStationaryContainer()
            assert.isFalse(container.sched.hasSchedule)
        })

        test('returns true when container has schedule with tasks', function () {
            const container = makeContainerWithSchedule()
            assert.isTrue(container.sched.hasSchedule)
        })
    })

    suite('isIdle', function () {
        test('returns true when container has no schedule', function () {
            const container = makeStationaryContainer()
            assert.isTrue(container.isIdle)
        })

        test('returns false when container has schedule', function () {
            const container = makeContainerWithSchedule()
            assert.isFalse(container.isIdle)
        })
    })

    suite('location', function () {
        test('returns Location object', function () {
            const container = makeStationaryContainer()
            const loc = container.location
            assert.equal(loc.coordinates.x.toNumber(), 5)
            assert.equal(loc.coordinates.y.toNumber(), 10)
        })
    })

    suite('orbitalAltitude', function () {
        test('returns z coordinate', function () {
            const container = makeStationaryContainer()
            assert.equal(container.orbitalAltitude, 1000)
        })

        test('returns 0 when z is undefined', function () {
            const container = makeContainer({
                id: 1,
                owner: 'teamgreymass',
                name: 'Test Container',
                coordinates: {x: 5, y: 10},
                hullmass: 50000,
                capacity: 500000,
            })
            assert.equal(container.orbitalAltitude, 0)
        })
    })

    suite('totalMass', function () {
        test('returns hullmass when no cargo', function () {
            const container = makeStationaryContainer()
            assert.isTrue(container.totalMass.equals(50000))
        })

        test('includes cargo mass', function () {
            const container = makeContainerWithCargo()
            assert.isTrue(container.totalMass.equals(150000))
        })
    })

    suite('maxCapacity', function () {
        test('returns capacity', function () {
            const container = makeStationaryContainer()
            assert.equal(container.maxCapacity.toNumber(), 500000)
        })
    })

    suite('availableCapacity', function () {
        test('returns full capacity when empty', function () {
            const container = makeStationaryContainer()
            assert.equal(container.availableCapacity.toNumber(), 500000)
        })

        test('returns reduced capacity when cargo loaded', function () {
            const container = makeContainerWithCargo()
            assert.equal(container.availableCapacity.toNumber(), 400000)
        })
    })

    suite('hasSpace', function () {
        test('returns true when space available', function () {
            const container = makeStationaryContainer()
            assert.isTrue(container.hasSpace(UInt64.from(100000)))
        })

        test('returns false when no space', function () {
            const container = makeStationaryContainer()
            assert.isFalse(container.hasSpace(UInt64.from(1000000)))
        })
    })

    suite('isFull', function () {
        test('returns false when not full', function () {
            const container = makeStationaryContainer()
            assert.isFalse(container.isFull)
        })

        test('returns true when at capacity', function () {
            const container = makeContainer({
                id: 1,
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

    suite('coordinates', function () {
        test('returns raw coordinates from entity', function () {
            const container = makeStationaryContainer()
            assert.equal(container.coordinates.x.toNumber(), 5)
            assert.equal(container.coordinates.y.toNumber(), 10)
        })
    })

    suite('schedule methods', function () {
        test('sched.duration returns total task duration', function () {
            const container = makeContainerWithSchedule()
            assert.equal(container.sched.duration(), 100)
        })

        test('sched.duration returns 0 when no schedule', function () {
            const container = makeStationaryContainer()
            assert.equal(container.sched.duration(), 0)
        })

        test('sched.elapsed calculates elapsed time', function () {
            const container = makeContainerWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(container.sched.elapsed(now), 50)
        })

        test('sched.remaining calculates remaining time', function () {
            const container = makeContainerWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(container.sched.remaining(now), 50)
        })

        test('sched.complete returns false when not complete', function () {
            const container = makeContainerWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.isFalse(container.sched.complete(now))
        })

        test('sched.complete returns true when complete', function () {
            const container = makeContainerWithSchedule()
            const now = new Date('2024-06-04T23:45:00.000Z')
            assert.isTrue(container.sched.complete(now))
        })

        test('sched.currentTaskIndex returns correct task', function () {
            const container = makeContainerWithSchedule()
            const now = new Date('2024-06-04T23:41:59.000Z')
            assert.equal(container.sched.currentTaskIndex(now), 0)
        })

        test('sched.currentTaskIndex returns -1 when no schedule', function () {
            const container = makeStationaryContainer()
            const now = new Date()
            assert.equal(container.sched.currentTaskIndex(now), -1)
        })
    })
})
