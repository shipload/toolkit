import {assert} from 'chai'
import {Checksum256} from '@wharfkit/antelope'
import {LocationsManager} from '$lib'
import {GameContext} from 'src/managers/context'

const testGameSeed = Checksum256.from(
    'a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
)
const testEpochSeed = Checksum256.from(
    'b3c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2'
)

// (-10, -4) is a known yielding asteroid under the test seeds.
const SYSTEM_COORDS = {x: -10, y: -4}
const EMPTY_COORDS = {x: 0, y: 0}

function buildManager(reserveOverrides: {stratum: number; remaining: number}[]): LocationsManager {
    const stubContext = {
        getGame: async () => ({config: {seed: testGameSeed}}),
        getState: async () => ({epochSeed: testEpochSeed}),
        server: {
            readonly: async (action: string) => {
                if (action !== 'getreserves') {
                    throw new Error(`unexpected readonly call: ${action}`)
                }
                return reserveOverrides
            },
        },
    } as unknown as GameContext
    return new LocationsManager(stubContext)
}

suite('LocationsManager.getStrata', () => {
    test('returns empty array for an empty (non-system) coord', async () => {
        const mgr = buildManager([])
        const result = await mgr.getStrata(EMPTY_COORDS)
        assert.deepEqual(result, [])
    })

    test('uses derived reserve when no chain override exists', async () => {
        const mgr = buildManager([])
        const result = await mgr.getStrata(SYSTEM_COORDS)
        assert.isAbove(result.length, 0, 'expected at least one stratum')
        for (const s of result) {
            assert.equal(
                s.reserve,
                s.reserveMax,
                `stratum ${s.index} should have reserve == reserveMax with no override`
            )
        }
    })

    test('overrides reserve when chain reports a touched stratum', async () => {
        const baseline = await buildManager([]).getStrata(SYSTEM_COORDS)
        assert.isAbove(baseline.length, 0, 'fixture sanity')
        const target = baseline[0]
        const overrideRemaining = Math.max(0, target.reserve - 1)

        const mgr = buildManager([{stratum: target.index, remaining: overrideRemaining}])
        const result = await mgr.getStrata(SYSTEM_COORDS)
        const matched = result.find((r) => r.index === target.index)
        assert.isDefined(matched)
        assert.equal(matched!.reserve, overrideRemaining, 'reserve should be the override')
        assert.equal(
            matched!.reserveMax,
            target.reserve,
            'reserveMax should be the original derived reserve'
        )
    })

    test('non-overridden strata pass through unchanged', async () => {
        const baseline = await buildManager([]).getStrata(SYSTEM_COORDS)
        assert.isAbove(baseline.length, 1, 'need at least 2 strata for this test')
        const overrideTarget = baseline[0]
        const untouched = baseline[1]

        const mgr = buildManager([{stratum: overrideTarget.index, remaining: 0}])
        const result = await mgr.getStrata(SYSTEM_COORDS)
        const matched = result.find((r) => r.index === untouched.index)
        assert.isDefined(matched)
        assert.equal(matched!.reserve, untouched.reserve)
        assert.equal(matched!.reserveMax, untouched.reserve)
    })
})
