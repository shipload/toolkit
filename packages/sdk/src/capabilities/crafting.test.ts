import {UInt16, UInt32} from '@wharfkit/antelope'
import {describe, expect, test} from 'bun:test'
import type {ServerContract} from '../contracts'
import {computeInputMass} from '../derivation/crafting'
import {getRecipe} from '../data/recipes-runtime'
import {
    calc_craft_energy,
    calcClusterIntake,
    calcClustercraftDuration,
    craftEnergyCost,
    INTAKE_RATE,
} from './crafting'

function crafterLane(drain: number): ServerContract.Types.crafter_lane {
    return {
        slot_index: UInt16.from(0),
        speed: UInt16.from(1000),
        drain: UInt32.from(drain),
        output_pct: UInt16.from(100),
    } as unknown as ServerContract.Types.crafter_lane
}

test('calc_craft_energy does not clamp above the old uint16 ceiling', () => {
    const energy = calc_craft_energy(30, 400_000_000)
    expect(Number(energy)).toBeGreaterThan(65535)
})

describe('calcClusterIntake', () => {
    test('is floor(sourcedMass / INTAKE_RATE)', () => {
        expect(INTAKE_RATE).toBe(360)
        expect(calcClusterIntake(360)).toBe(1)
        expect(calcClusterIntake(359)).toBe(0)
        expect(calcClusterIntake(196_800)).toBe(546)
    })

    test('zero sourced mass (all own-hold) charges no intake', () => {
        expect(calcClusterIntake(0)).toBe(0)
    })
})

describe('calcClustercraftDuration', () => {
    test('adds intake to the base craft duration', () => {
        // calc_craft_duration = floor(inputMass/speed) + 1
        const speed = 1000
        const inputMass = 1000 // base craft = 100 + 1 = 101s
        const sourcedMass = 720 // intake = 2s
        expect(calcClustercraftDuration(speed, inputMass, sourcedMass).toNumber()).toBe(103)
    })
})

describe('craftEnergyCost', () => {
    const OUTPUT_ITEM_ID = 10001
    const DRAIN = 100_000

    test('matches calc_craft_energy against the recipe input mass times units', () => {
        const recipe = getRecipe(OUTPUT_ITEM_ID)!
        const lane = crafterLane(DRAIN)
        const units = 5

        const cost = craftEnergyCost(lane, recipe, units)

        const expected = Number(calc_craft_energy(DRAIN, computeInputMass(OUTPUT_ITEM_ID) * units))
        expect(cost).toBe(expected)
    })

    test('is 0 for non-positive units', () => {
        const recipe = getRecipe(OUTPUT_ITEM_ID)!
        const lane = crafterLane(DRAIN)
        expect(craftEnergyCost(lane, recipe, 0)).toBe(0)
        expect(craftEnergyCost(lane, recipe, -1)).toBe(0)
    })

    test('scales with unit count', () => {
        const recipe = getRecipe(OUTPUT_ITEM_ID)!
        const lane = crafterLane(DRAIN)
        const one = craftEnergyCost(lane, recipe, 1)
        const ten = craftEnergyCost(lane, recipe, 10)
        expect(ten).toBeGreaterThan(one)
    })
})
