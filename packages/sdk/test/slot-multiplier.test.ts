import {describe, expect, test} from 'bun:test'
import {applySlotMultiplier} from '../src/entities/slot-multiplier'
import {computeShipCapabilities, type InstalledModule} from '../src/entities/ship-deploy'
import {ITEM_GATHERER_T1, ITEM_GENERATOR_T1, ITEM_LOADER_T1} from '../src/data/item-ids'
import type {EntitySlot} from '../src/data/recipes-runtime'

describe('applySlotMultiplier', () => {
    test('100% is identity', () => {
        expect(applySlotMultiplier(400, 100)).toBe(400)
        expect(applySlotMultiplier(0, 100)).toBe(0)
    })

    test('200% doubles the value', () => {
        expect(applySlotMultiplier(400, 200)).toBe(800)
    })

    test('50% halves the value (integer division)', () => {
        expect(applySlotMultiplier(400, 50)).toBe(200)
        expect(applySlotMultiplier(401, 50)).toBe(200)
    })

    test('clamps to uint16 max (65535)', () => {
        expect(applySlotMultiplier(40000, 200)).toBe(65535)
        expect(applySlotMultiplier(65535, 100)).toBe(65535)
        expect(applySlotMultiplier(65536, 100)).toBe(65535)
    })

    test('handles 0% (zeroes the output)', () => {
        expect(applySlotMultiplier(400, 0)).toBe(0)
    })
})

const baselineLayout: EntitySlot[] = Array.from({length: 5}, () => ({
    type: 'any',
    outputPct: 100,
}))

const sampleStats = 0n

describe('computeShipCapabilities slot-multiplier integration', () => {
    test('100% on generator slot produces nonzero baseline', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_GENERATOR_T1, stats: sampleStats},
        ]
        const baseline = computeShipCapabilities(modules, baselineLayout)
        expect(baseline.generator?.capacity).toBeGreaterThan(0)
        expect(baseline.generator?.recharge).toBeGreaterThan(0)
    })

    test('200% on generator slot doubles capacity and recharge', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 0, itemId: ITEM_GENERATOR_T1, stats: sampleStats},
        ]
        const ampGenLayout: EntitySlot[] = baselineLayout.map((s, i) =>
            i === 0 ? {...s, outputPct: 200} : s
        )
        const baseline = computeShipCapabilities(modules, baselineLayout)
        const amplified = computeShipCapabilities(modules, ampGenLayout)
        expect(amplified.generator!.capacity).toBe(2 * baseline.generator!.capacity)
        expect(amplified.generator!.recharge).toBe(2 * baseline.generator!.recharge)
    })
})

describe('computeShipCapabilities — selective application', () => {
    test('200% on gatherer slot amplifies yield + speed only', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 1, itemId: ITEM_GATHERER_T1, stats: sampleStats},
        ]
        const ampGathLayout: EntitySlot[] = baselineLayout.map((s, i) =>
            i === 1 ? {...s, outputPct: 200} : s
        )
        const baseline = computeShipCapabilities(modules, baselineLayout)
        const amplified = computeShipCapabilities(modules, ampGathLayout)

        expect(amplified.gatherer!.yield).toBe(2 * baseline.gatherer!.yield)
        expect(amplified.gatherer!.speed).toBe(2 * baseline.gatherer!.speed)
        expect(amplified.gatherer!.drain).toBe(baseline.gatherer!.drain)
        expect(amplified.gatherer!.depth).toBe(baseline.gatherer!.depth)
    })

    test('200% on loader slot amplifies thrust only', () => {
        const modules: InstalledModule[] = [
            {slotIndex: 2, itemId: ITEM_LOADER_T1, stats: sampleStats},
        ]
        const ampLoadLayout: EntitySlot[] = baselineLayout.map((s, i) =>
            i === 2 ? {...s, outputPct: 200} : s
        )
        const baseline = computeShipCapabilities(modules, baselineLayout)
        const amplified = computeShipCapabilities(modules, ampLoadLayout)

        expect(amplified.loaders!.thrust).toBe(2 * baseline.loaders!.thrust)
        expect(amplified.loaders!.mass).toBe(baseline.loaders!.mass)
        expect(amplified.loaders!.quantity).toBe(baseline.loaders!.quantity)
    })
})
