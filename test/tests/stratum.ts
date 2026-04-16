import {assert} from 'chai'
import {deriveResourceStats} from '$lib'

suite('deriveResourceStats', function () {
    test('stat range [1, 999] with wide sample', function () {
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
        assert.equal(max, 999, 'maximum stat across 1M rolls should reach 999')
    })

    test('stats ≥ 900 are reachable but rare', function () {
        let count = 0
        const N = 100_000
        for (let i = 0n; i < BigInt(N); i++) {
            const s = deriveResourceStats(i)
            if (Math.max(s.stat1, s.stat2, s.stat3) >= 900) count++
        }
        assert.isAbove(count, 0, 'at least one roll out of 100k should reach ≥900')
        assert.isBelow(count / N, 0.05, 'rolls ≥ 900 should be rarer than 5%')
    })

    test('pinned god-roll fixtures verified against chain getstratum', function () {
        // Each seed is a stratum seed from a real in-game location; stats verified
        // bit-identical against chain readonly getstratum action on jungle4.
        const fixtures: Array<{seed: bigint; expected: [number, number, number]}> = [
            {seed: 16935472556141801077n, expected: [250, 403, 999]},
            {seed: 15384447992939883572n, expected: [172, 68, 999]},
            {seed: 4869367892462234025n, expected: [357, 410, 966]},
            {seed: 2142503998531864987n, expected: [932, 226, 165]},
            {seed: 5078404602415635064n, expected: [23, 915, 119]},
            {seed: 12234581768906708194n, expected: [907, 213, 406]},
            {seed: 17322139064631866429n, expected: [151, 189, 901]},
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
