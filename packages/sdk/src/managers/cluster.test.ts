import {describe, expect, test} from 'bun:test'
import {computeFreeCells} from './cluster'

describe('computeFreeCells', () => {
    test('returns footprint cells that are not occupied', () => {
        const footprint = [
            {gx: 2, gy: 0},
            {gx: 0, gy: 2},
            {gx: 1, gy: 1},
        ]
        const occupied = [{gx: 2, gy: 0, entity: 7}]
        expect(computeFreeCells(footprint, occupied)).toEqual([
            {gx: 0, gy: 2},
            {gx: 1, gy: 1},
        ])
    })

    test('matches occupancy on signed coordinates', () => {
        const footprint = [
            {gx: -2, gy: 0},
            {gx: 0, gy: -2},
            {gx: -1, gy: 1},
        ]
        const occupied = [{gx: 0, gy: -2, entity: 9}]
        expect(computeFreeCells(footprint, occupied)).toEqual([
            {gx: -2, gy: 0},
            {gx: -1, gy: 1},
        ])
    })

    test('empty footprint yields no free cells', () => {
        expect(computeFreeCells([], [])).toEqual([])
    })

    test('fully occupied footprint yields no free cells', () => {
        const footprint = [{gx: 1, gy: 1}]
        expect(computeFreeCells(footprint, [{gx: 1, gy: 1, entity: 3}])).toEqual([])
    })
})
