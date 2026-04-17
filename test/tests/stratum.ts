import {assert} from 'chai'
import {Checksum256} from '@wharfkit/antelope'
import {deriveResourceStats, deriveStratum, RESERVE_TIERS, ReserveTier} from '$lib'

suite('deriveResourceStats', function () {
    test('stat range [1, 999] is bounded', function () {
        let min = 999
        let max = 1
        for (let i = 0n; i < 1_000_000n; i++) {
            const s = deriveResourceStats(i)
            const lo = Math.min(s.stat1, s.stat2, s.stat3)
            const hi = Math.max(s.stat1, s.stat2, s.stat3)
            if (lo < min) min = lo
            if (hi > max) max = hi
        }
        assert.equal(min, 1, 'minimum stat across 1M rolls should be 1')
        assert.isAtMost(max, 999, 'stats should never exceed 999')
        assert.isAtLeast(max, 700, 'maximum over 1M rolls should reach at least 700')
    })

    test('stats ≥ 900 are rare but reachable at k=0.24', function () {
        let count = 0
        const N = 5_000_000
        for (let i = 0n; i < BigInt(N); i++) {
            const s = deriveResourceStats(i)
            if (Math.max(s.stat1, s.stat2, s.stat3) >= 900) count++
        }
        assert.isAbove(count, 0, 'at least one roll out of 5M should reach ≥900')
        assert.isBelow(count / N, 0.0001, 'rolls ≥ 900 should be rarer than 1 in 10k')
    })

    test('pinned god-roll fixtures at k=0.24', function () {
        // Seeds found by brute-force search for ≥900 under the current formula
        // (scale 0.24, u32 extraction, val≤999 cap). Any change to the weibull
        // constants or byte-ordering will break these and requires a re-derive.
        const fixtures: Array<{seed: bigint; expected: [number, number, number]}> = [
            {seed: 167853n, expected: [134, 930, 334]},
            {seed: 1088170n, expected: [173, 932, 192]},
            {seed: 1159026n, expected: [389, 264, 916]},
            {seed: 2588999n, expected: [311, 102, 917]},
            {seed: 3190026n, expected: [944, 138, 306]},
            {seed: 3287518n, expected: [223, 914, 77]},
            {seed: 3407349n, expected: [940, 167, 297]},
            {seed: 3459549n, expected: [915, 143, 166]},
            {seed: 3628845n, expected: [139, 196, 944]},
            {seed: 4614376n, expected: [941, 202, 79]},
        ]

        for (const {seed, expected} of fixtures) {
            const s = deriveResourceStats(seed)
            assert.deepEqual(
                [s.stat1, s.stat2, s.stat3],
                expected,
                `seed ${seed} expected [${expected.join(',')}] but got [${s.stat1},${s.stat2},${
                    s.stat3
                }]`
            )
            const max = Math.max(s.stat1, s.stat2, s.stat3)
            assert.isAtLeast(max, 900, `seed ${seed} should produce a stat ≥ 900`)
        }
    })

    test('is deterministic', function () {
        const seed = 12345678901234567890n
        const a = deriveResourceStats(seed)
        const b = deriveResourceStats(seed)
        assert.deepEqual(a, b)
    })
})

suite('deriveStratum reserve tiers', function () {
    const epochSeed = Checksum256.from(
        '0202020202020202020202020202020202020202020202020202020202020202'
    )

    test('reserve fits a tier range when nonzero (asteroid)', function () {
        let nonzero = 0
        for (let x = 0; x < 200 && nonzero < 50; x++) {
            for (let y = 0; y < 200 && nonzero < 50; y++) {
                for (let s = 1; s <= 100 && nonzero < 50; s++) {
                    const r = deriveStratum(epochSeed, {x, y}, s, 2, 0, 65535)
                    if (r.reserve > 0) {
                        nonzero++
                        const fits = (
                            Object.values(RESERVE_TIERS) as Array<{min: number; max: number}>
                        ).some((range) => r.reserve >= range.min && r.reserve <= range.max)
                        assert.isTrue(fits, `reserve ${r.reserve} at (${x},${y},${s}) is in a gap`)
                    }
                }
            }
        }
        assert.isAtLeast(nonzero, 1, 'expected at least one nonzero reserve in scan window')
    })

    test('yield rate near 0.1%', function () {
        let yielded = 0
        const N = 100_000
        for (let i = 0; i < N; i++) {
            const x = i % 1000
            const y = Math.floor(i / 1000)
            const r = deriveStratum(epochSeed, {x, y}, 1, 2, 0, 65535)
            if (r.reserve > 0) yielded++
        }
        const rate = yielded / N
        assert.isAbove(rate, 0.0005, `yield rate ${rate} too low`)
        assert.isBelow(rate, 0.002, `yield rate ${rate} too high`)
    })

    test('deeper strata bias toward larger tiers', function () {
        const counts = (stratum: number): Record<ReserveTier, number> => {
            const c: Record<ReserveTier, number> = {
                small: 0,
                medium: 0,
                large: 0,
                massive: 0,
                motherlode: 0,
            }
            for (let x = 0; x < 1000; x++) {
                for (let y = 0; y < 100; y++) {
                    const r = deriveStratum(epochSeed, {x, y}, stratum, 2, 0, 65535)
                    if (r.reserve === 0) continue
                    for (const [tier, range] of Object.entries(RESERVE_TIERS) as Array<
                        [ReserveTier, {min: number; max: number}]
                    >) {
                        if (r.reserve >= range.min && r.reserve <= range.max) {
                            c[tier]++
                            break
                        }
                    }
                }
            }
            return c
        }
        const shallow = counts(1)
        const deep = counts(65000)
        const shallowYielded = Object.values(shallow).reduce((a, b) => a + b, 0)
        const deepYielded = Object.values(deep).reduce((a, b) => a + b, 0)
        assert.isAtLeast(shallowYielded, 10)
        assert.isAtLeast(deepYielded, 10)
        const shallowMedPlus =
            (shallow.medium + shallow.large + shallow.massive + shallow.motherlode) / shallowYielded
        const deepMedPlus =
            (deep.medium + deep.large + deep.massive + deep.motherlode) / deepYielded
        assert.isAbove(deepMedPlus, shallowMedPlus, 'depth should bias toward bigger tiers')
    })
})
