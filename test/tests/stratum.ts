import {assert} from 'chai'
import {deriveResourceStats} from '$lib'

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
                `seed ${seed} expected [${expected.join(',')}] but got [${s.stat1},${s.stat2},${s.stat3}]`
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
