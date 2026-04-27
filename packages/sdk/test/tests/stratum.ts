import {assert} from 'chai'
import {Checksum256} from '@wharfkit/antelope'
import {deriveResourceStats, deriveStratum, RESERVE_TIERS, ReserveTier} from '$lib'

suite('deriveResourceStats', () => {
    test('stat range [1, 999] is bounded', () => {
        // 10K seeds × 3 stats = 30K samples. At weibull k=0.24 the per-sample rate
        // of stat=1 is ~0.003, so min=1 is reliably hit; max in this window typically
        // reaches ~800. The ≤999 upper bound is a structural invariant of the weibull
        // floor() + cap, and is verified on every sample here.
        let min = 999
        let max = 1
        for (let i = 0n; i < 10_000n; i++) {
            const s = deriveResourceStats(i)
            const lo = Math.min(s.stat1, s.stat2, s.stat3)
            const hi = Math.max(s.stat1, s.stat2, s.stat3)
            if (lo < min) min = lo
            if (hi > max) max = hi
        }
        assert.equal(min, 1, 'minimum stat across 10K rolls should reach 1')
        assert.isAtMost(max, 999, 'stats should never exceed 999')
        assert.isAtLeast(max, 700, 'maximum over 10K rolls should reach at least 700')
    })

    test('stats ≥ 900 rate stays under 1 in 5k', () => {
        // Reachability of ≥900 is covered by the pinned god-roll fixtures below;
        // this test only bounds the tail rate. At true rate ~1e-4 (weibull k=0.24,
        // max-of-3), expected count in 100K is ~10. Asserting observed rate < 2e-4
        // catches any 2×+ regression while staying within Poisson noise.
        let count = 0
        const N = 100_000
        for (let i = 0n; i < BigInt(N); i++) {
            const s = deriveResourceStats(i)
            if (Math.max(s.stat1, s.stat2, s.stat3) >= 900) count++
        }
        assert.isBelow(
            count / N,
            0.0002,
            `rolls ≥ 900 should stay rarer than 1 in 5k (saw ${count})`
        )
    })

    test('pinned god-roll fixtures at k=0.24', () => {
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

    test('is deterministic', () => {
        const seed = 12345678901234567890n
        const a = deriveResourceStats(seed)
        const b = deriveResourceStats(seed)
        assert.deepEqual(a, b)
    })
})

suite('deriveStratum reserve tiers', () => {
    const epochSeed = Checksum256.from(
        '0202020202020202020202020202020202020202020202020202020202020202'
    )

    test('reserve fits a tier range when nonzero (asteroid)', () => {
        // Pinned coords (epoch 0x02…, stratum=1) known to produce nonzero reserves.
        // Replaces a brute-force grid scan. Any change to the reserve generator or
        // RESERVE_TIERS ranges will break these and requires a re-derive.
        const coords = [
            {x: 12, y: 89},
            {x: 12, y: 111},
            {x: 21, y: 131},
            {x: 24, y: 170},
            {x: 34, y: 127},
            {x: 40, y: 62},
            {x: 45, y: 48},
            {x: 55, y: 50},
            {x: 65, y: 165},
            {x: 74, y: 108},
        ]
        for (const {x, y} of coords) {
            const r = deriveStratum(epochSeed, {x, y}, 1, 2, 0, 65535)
            assert.isAbove(r.reserve, 0, `pinned coord (${x},${y}) should yield nonzero reserve`)
            const fits = (Object.values(RESERVE_TIERS) as Array<{min: number; max: number}>).some(
                (range) => r.reserve >= range.min && r.reserve <= range.max
            )
            assert.isTrue(fits, `reserve ${r.reserve} at (${x},${y}) is in a gap`)
        }
    })

    test('yield rate near 0.1%', () => {
        // 30K samples at true rate ~0.001 gives 99% CI roughly [0.00066, 0.0015].
        // The [0.0005, 0.002] bounds comfortably contain that CI.
        let yielded = 0
        const N = 30_000
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

    test('deeper strata bias toward larger tiers', () => {
        // 25K samples per stratum at yield rate ~0.001 gives ~25 yields each, enough
        // signal to observe the depth-bias effect (shallow is dominated by 'small';
        // deep shifts weight to 'medium' and above).
        const counts = (stratum: number): Record<ReserveTier, number> => {
            const c: Record<ReserveTier, number> = {
                small: 0,
                medium: 0,
                large: 0,
                massive: 0,
                motherlode: 0,
            }
            for (let x = 0; x < 500; x++) {
                for (let y = 0; y < 50; y++) {
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
