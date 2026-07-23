import {describe, expect, test} from 'bun:test'
import {
    calc_craft_energy,
    calcClusterIntake,
    calcClustercraftDuration,
    INTAKE_RATE,
} from './crafting'

test('calc_craft_energy does not clamp above the old uint16 ceiling', () => {
    const energy = calc_craft_energy(30, 400_000_000)
    expect(Number(energy)).toBeGreaterThan(65535)
})

describe('calcClusterIntake', () => {
    test('is floor(sourcedMass / INTAKE_RATE)', () => {
        expect(INTAKE_RATE).toBe(36000)
        expect(calcClusterIntake(36000)).toBe(1)
        expect(calcClusterIntake(35999)).toBe(0)
        expect(calcClusterIntake(19_680_000)).toBe(546)
    })

    test('zero sourced mass (all own-hold) charges no intake', () => {
        expect(calcClusterIntake(0)).toBe(0)
    })
})

describe('calcClustercraftDuration', () => {
    test('adds intake to the base craft duration', () => {
        // calc_craft_duration = floor(inputMass/speed) + 1
        const speed = 1000
        const inputMass = 100_000 // base craft = 100 + 1 = 101s
        const sourcedMass = 72_000 // intake = 2s
        expect(calcClustercraftDuration(speed, inputMass, sourcedMass).toNumber()).toBe(103)
    })
})
