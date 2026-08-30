import {expect, test} from 'bun:test'
import {UInt32, UInt64} from '@wharfkit/antelope'
import {hasSpaceForMass, isFull, isFullFromMass} from './storage'

test('hasSpaceForMass accepts raw numbers', () => {
    expect(hasSpaceForMass(100, 40, 50)).toBe(true)
    expect(hasSpaceForMass(100, 60, 50)).toBe(false)
    expect(hasSpaceForMass(100, 50, 50)).toBe(true)
})

test('hasSpaceForMass accepts wrapped values', () => {
    expect(hasSpaceForMass(UInt64.from(100), UInt64.from(40), UInt64.from(50))).toBe(true)
    expect(hasSpaceForMass(UInt64.from(100), UInt32.from(60), UInt32.from(50))).toBe(false)
})

test('isFullFromMass accepts raw numbers', () => {
    expect(isFullFromMass(100, 100)).toBe(true)
    expect(isFullFromMass(100, 101)).toBe(true)
    expect(isFullFromMass(100, 99)).toBe(false)
})

test('isFull accepts raw numbers on the entity', () => {
    expect(isFull({capacity: 100, cargomass: 100})).toBe(true)
    expect(isFull({capacity: 100, cargomass: 99})).toBe(false)
    expect(isFull({capacity: UInt32.from(100), cargomass: UInt32.from(120)})).toBe(true)
})
