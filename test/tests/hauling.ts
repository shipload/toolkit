import {assert} from 'chai'
import {computeHaulerDrain, computeHaulPenalty} from '$lib'

suite('computeHaulPenalty', () => {
    test('returns total_thrust unchanged when haul_count is 0', () => {
        assert.equal(computeHaulPenalty(1000, 0, 5000), 1000)
    })
    test('reduces thrust when hauling at 50% efficiency', () => {
        assert.equal(computeHaulPenalty(1000, 2, 5000), 769)
    })
    test('applies no penalty at 100% efficiency', () => {
        assert.equal(computeHaulPenalty(1000, 3, 10000), 1000)
    })
    test('applies full penalty at 0% efficiency', () => {
        assert.equal(computeHaulPenalty(1000, 2, 0), 625)
    })
})

suite('computeHaulerDrain', () => {
    test('scales linearly with distance and haul_count', () => {
        assert.equal(computeHaulerDrain(10000, 9, 2), 18)
        assert.equal(computeHaulerDrain(100000, 9, 2), 180)
        assert.equal(computeHaulerDrain(10000, 9, 0), 0)
    })
})
