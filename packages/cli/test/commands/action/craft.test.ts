import {describe, expect, test} from 'bun:test'
import {buildAction, decideUseRecharge} from '../../../src/commands/action/craft'
import type {EstimateResult} from '../../../src/lib/estimate'
import {getLocalShipload} from '../../helpers/shipload'

function estimate(
    overrides: Partial<EstimateResult> & {feasibility: EstimateResult['feasibility']}
): EstimateResult {
    return {
        duration_s: 1,
        energy_cost: 0,
        cargo_delta: {},
        ...overrides,
    }
}

const FEASIBLE = estimate({feasibility: {ok: true, issues: []}})

const ENERGY_BLOCKED = estimate({
    feasibility: {
        ok: false,
        issues: [
            {
                code: 'insufficient_energy',
                severity: 'error',
                message: 'craft needs 312 energy, entity has 39',
            },
        ],
    },
})

const CARGO_BLOCKED = estimate({
    feasibility: {
        ok: false,
        issues: [
            {
                code: 'insufficient_cargo_capacity',
                severity: 'error',
                message: 'cargo delta 500 exceeds available 100',
            },
        ],
    },
})

const ENERGY_CAPACITY_BLOCKED = estimate({
    feasibility: {
        ok: false,
        issues: [
            {
                code: 'energy_capacity_exceeded',
                severity: 'error',
                message: 'craft requires 9999 energy capacity, entity cap is 4000',
            },
        ],
    },
})

test('craft builds action with single input', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            recipeId: 7,
            quantity: 2,
            inputs: [{itemId: 5, quantity: 100, stackId: 0n}],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('craft')
})

test('craft buildAction passes recipe id in UInt16 range', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            recipeId: 65535,
            quantity: 1,
            inputs: [],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('craft')
})

test('craft buildAction accepts multi-stack inputs (same item, different stacks)', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            recipeId: 10003,
            quantity: 1,
            inputs: [
                {itemId: 301, quantity: 11, stackId: 1000n},
                {itemId: 301, quantity: 21, stackId: 2000n},
            ],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('craft')
})

describe('decideUseRecharge', () => {
    test('explicit --recharge wins regardless of auto-recharge', async () => {
        let reestimated = 0
        const result = await decideUseRecharge({
            rechargeRequested: true,
            autoRecharge: true,
            baseEstimate: ENERGY_BLOCKED,
            reestimateWithRecharge: async () => {
                reestimated++
                return FEASIBLE
            },
        })
        expect(result).toBe(true)
        expect(reestimated).toBe(0)
    })

    test('explicit --recharge alone returns true without re-estimating', async () => {
        let reestimated = 0
        const result = await decideUseRecharge({
            rechargeRequested: true,
            autoRecharge: false,
            baseEstimate: ENERGY_BLOCKED,
            reestimateWithRecharge: async () => {
                reestimated++
                return FEASIBLE
            },
        })
        expect(result).toBe(true)
        expect(reestimated).toBe(0)
    })

    test('no flags set returns false', async () => {
        const result = await decideUseRecharge({
            rechargeRequested: false,
            autoRecharge: false,
            baseEstimate: ENERGY_BLOCKED,
            reestimateWithRecharge: async () => FEASIBLE,
        })
        expect(result).toBe(false)
    })

    test('--auto-recharge with already-feasible base returns false (no re-estimate)', async () => {
        let reestimated = 0
        const result = await decideUseRecharge({
            rechargeRequested: false,
            autoRecharge: true,
            baseEstimate: FEASIBLE,
            reestimateWithRecharge: async () => {
                reestimated++
                return FEASIBLE
            },
        })
        expect(result).toBe(false)
        expect(reestimated).toBe(0)
    })

    test('--auto-recharge with energy gap that recharge would close returns true', async () => {
        let reestimated = 0
        const result = await decideUseRecharge({
            rechargeRequested: false,
            autoRecharge: true,
            baseEstimate: ENERGY_BLOCKED,
            reestimateWithRecharge: async () => {
                reestimated++
                return FEASIBLE
            },
        })
        expect(result).toBe(true)
        expect(reestimated).toBe(1)
    })

    test('--auto-recharge with energy gap that recharge would NOT close returns false', async () => {
        let reestimated = 0
        const result = await decideUseRecharge({
            rechargeRequested: false,
            autoRecharge: true,
            baseEstimate: ENERGY_BLOCKED,
            reestimateWithRecharge: async () => {
                reestimated++
                return ENERGY_CAPACITY_BLOCKED
            },
        })
        expect(result).toBe(false)
        expect(reestimated).toBe(1)
    })

    test('--auto-recharge with non-energy infeasibility returns false without re-estimating', async () => {
        let reestimated = 0
        const result = await decideUseRecharge({
            rechargeRequested: false,
            autoRecharge: true,
            baseEstimate: CARGO_BLOCKED,
            reestimateWithRecharge: async () => {
                reestimated++
                return FEASIBLE
            },
        })
        expect(result).toBe(false)
        expect(reestimated).toBe(0)
    })
})
