import {describe, expect, test} from 'bun:test'
import {Checksum256} from '@wharfkit/antelope'
import {deriveLocationSize} from '../derivation/location-size'
import {yieldThresholdAt} from '../derivation/resources'
import {deriveResourceStats, deriveStratum, resourceStatFromRaw} from '../derivation/stratum'
import {
    applyResourceTierMultiplier,
    RESERVE_TIERS,
    rollTier,
    rollWithinTier,
} from '../derivation/tiers'
import {deriveLocationStatic} from '../utils/system'

const TWO32 = 2 ** 32
const GAME = Checksum256.from('0be1140ada53742f96d665c114fa693bd1512f886b6949b08b570fd70b764e83')
const EPOCH = Checksum256.from('0000000000000000000000000000000000000000000000000000000000000002')

function firstRawAtLeast(v: number): number {
    let lo = 0
    let hi = TWO32 - 1
    if (resourceStatFromRaw(hi) < v) return TWO32
    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2)
        if (resourceStatFromRaw(mid) >= v) hi = mid
        else lo = mid + 1
    }
    return lo
}

const countAtLeast = (v: number) => TWO32 - firstRawAtLeast(v)

describe('WP-WG-17 and WP-WG-18 stat distribution (exact over all 2^32 raw values)', () => {
    test('stat range is 1 to 999', () => {
        expect(resourceStatFromRaw(0)).toBe(1)
        expect(resourceStatFromRaw(TWO32 - 1)).toBe(999)
    })

    test('1 in 1.28M draws is at or above 900', () => {
        const n = countAtLeast(900)
        expect(TWO32 / n).toBeGreaterThan(1_270_000)
        expect(TWO32 / n).toBeLessThan(1_285_000)
    })

    test('999 is 1 in 33.5M draws and 24.5x the density of 990 to 998', () => {
        const n999 = countAtLeast(999)
        expect(TWO32 / n999).toBeGreaterThan(33_000_000)
        expect(TWO32 / n999).toBeLessThan(34_000_000)
        let neighbours = 0
        for (let v = 990; v <= 998; v++) neighbours += countAtLeast(v) - countAtLeast(v + 1)
        const ratio = n999 / (neighbours / 9)
        expect(ratio).toBeGreaterThan(24)
        expect(ratio).toBeLessThan(25)
    })

    test('mean 213, median 200, P99 515', () => {
        let sum = 0
        for (let v = 1; v <= 999; v++) sum += countAtLeast(v)
        expect(sum / TWO32).toBeGreaterThan(212.5)
        expect(sum / TWO32).toBeLessThan(213.5)
        let median = 0
        let p99 = 0
        for (let v = 1; v <= 999; v++) {
            const below = 1 - countAtLeast(v + 1) / TWO32
            if (!median && below >= 0.5) median = v
            if (!p99 && below >= 0.99) p99 = v
        }
        expect(median).toBe(200)
        expect(p99).toBe(515)
    })

    test('SDK deriveResourceStats follows the same transform (sample moments)', () => {
        const draws: number[] = []
        for (let seed = 1n; seed <= 60000n; seed++) {
            const s = deriveResourceStats(seed * 2654435761n)
            draws.push(s.stat1, s.stat2, s.stat3)
        }
        const mean = draws.reduce((a, b) => a + b, 0) / draws.length
        expect(Math.abs(mean - 212.98)).toBeLessThan(1)
        const sorted = [...draws].sort((a, b) => a - b)
        expect(Math.abs(sorted[Math.floor(sorted.length / 2)] - 200)).toBeLessThanOrEqual(1)
        expect(Math.abs(sorted[Math.floor(sorted.length * 0.99)] - 515)).toBeLessThanOrEqual(8)
        expect(Math.min(...draws)).toBeGreaterThanOrEqual(1)
        expect(Math.max(...draws)).toBeLessThanOrEqual(999)
    }, 120000)
})

describe('WP-WG-14 yield gate', () => {
    test('threshold fraction is 0.20% at stratum 0, 0.04% at 65,535, linear between', () => {
        expect(yieldThresholdAt(0) / TWO32).toBeCloseTo(0.002, 6)
        expect(yieldThresholdAt(65535) / TWO32).toBeCloseTo(0.0004, 6)
        expect(yieldThresholdAt(32767.5) / TWO32).toBeCloseTo(0.0012, 6)
    })

    test('empirical hit rate matches at both ends', () => {
        const rate = (stratum: number, n: number) => {
            let hits = 0
            for (let i = 0; i < n; i++) {
                const r = deriveStratum(
                    EPOCH,
                    {x: i % 2000, y: Math.floor(i / 2000)},
                    stratum,
                    2,
                    0,
                    65535
                )
                if (r.reserve > 0) hits++
            }
            return hits / n
        }
        const shallow = rate(0, 1_000_000)
        expect(shallow).toBeGreaterThan(0.00182)
        expect(shallow).toBeLessThan(0.00218)
        const deep = rate(65535, 2_000_000)
        expect(deep).toBeGreaterThan(0.00033)
        expect(deep).toBeLessThan(0.00047)
    }, 300000)
})

describe('WP-WG-15 reserve tiers', () => {
    function odds(stratum: number): number[] {
        const names = ['small', 'medium', 'large', 'massive', 'motherlode']
        const firstAt = names.map((n) => {
            let lo = 0
            let hi = TWO32 - 1
            if (n === 'small') return 0
            if (rollTier(hi, stratum) !== 'motherlode' && n === 'motherlode') return TWO32
            while (lo < hi) {
                const mid = Math.floor((lo + hi) / 2)
                if (names.indexOf(rollTier(mid, stratum)) >= names.indexOf(n)) hi = mid
                else lo = mid + 1
            }
            return lo
        })
        return firstAt.map((s, i) => ((i === 4 ? TWO32 : firstAt[i + 1]) - s) / TWO32)
    }

    test('shallow odds 80 / 19.1946 / 0.8 / 0.005 / 0.0004 percent', () => {
        const o = odds(0)
        const want = [0.8, 0.191946, 0.008, 0.00005, 0.000004]
        for (const [i, p] of o.entries()) expect(Math.abs(p - want[i])).toBeLessThan(2e-7)
    })

    test('deep odds 50 / 45.892 / 4 / 0.1 / 0.008 percent', () => {
        const o = odds(65535)
        const want = [0.5, 0.45892, 0.04, 0.001, 0.00008]
        for (const [i, p] of o.entries()) expect(Math.abs(p - want[i])).toBeLessThan(2e-7)
    })

    test('odds interpolate linearly with depth', () => {
        const a = odds(0)
        const b = odds(65535)
        const mid = odds(32767.5)
        for (const [i, p] of mid.entries())
            expect(Math.abs(p - (a[i] + b[i]) / 2)).toBeLessThan(2e-6)
    })

    test('tier ranges in tonnes and the T1 multiplier of 20', () => {
        const t = (min: number, max: number) => [min / 10, max / 10]
        expect(t(RESERVE_TIERS.small.min, RESERVE_TIERS.small.max)).toEqual([3600, 14400])
        expect(t(RESERVE_TIERS.motherlode.min, RESERVE_TIERS.motherlode.max)).toEqual([
            960000, 2400000,
        ])
        expect(rollWithinTier(0, RESERVE_TIERS.small, 10)).toBe(3600)
        expect(rollWithinTier(65535, RESERVE_TIERS.motherlode, 10)).toBe(2400000)
        expect(applyResourceTierMultiplier(3600, 1)).toBe(72000)
    })
})

describe('WP-WG-16 richness', () => {
    function richnessSample(stratum: number, n: number): number[] {
        const out: number[] = []
        for (let i = 0; i < n; i++) {
            const r = deriveStratum(
                EPOCH,
                {x: i % 2000, y: 3 + Math.floor(i / 2000)},
                stratum,
                2,
                0,
                65535
            )
            if (r.reserve > 0) out.push(r.richness)
        }
        return out
    }
    const stats = (xs: number[]) => {
        const m = xs.reduce((a, b) => a + b, 0) / xs.length
        const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)
        return {m, sd}
    }

    test('mean 500, sd about 100, within 1 to 999, equal at shallow and deep strata', () => {
        const shallow = richnessSample(10, 3_000_000)
        const deep = richnessSample(60000, 3_000_000)
        const s = stats(shallow)
        const d = stats(deep)
        expect(shallow.length).toBeGreaterThan(3000)
        expect(deep.length).toBeGreaterThan(500)
        expect(Math.abs(s.m - 500)).toBeLessThan(6)
        expect(Math.abs(d.m - 500)).toBeLessThan(12)
        expect(Math.abs(s.sd - 100)).toBeLessThan(6)
        expect(Math.abs(d.sd - 100)).toBeLessThan(12)
        expect(Math.min(...shallow, ...deep)).toBeGreaterThanOrEqual(1)
        expect(Math.max(...shallow, ...deep)).toBeLessThanOrEqual(999)
    }, 600000)
})

describe('WP-WG-10 and WP-WG-12 location mix and size', () => {
    const N = 700
    const systems: {type: number; subtype: number; size: number}[] = []
    let tiles = 0
    for (let x = -N; x < N; x++) {
        for (let y = -N; y < N; y++) {
            tiles++
            const loc = deriveLocationStatic(GAME, {x, y})
            const type = Number(loc.type)
            if (type === 0) continue
            systems.push({type, subtype: Number(loc.subtype), size: deriveLocationSize(loc)})
        }
    }

    test('one tile in 16 holds a system', () => {
        const p = 1 / 16
        const sigma = Math.sqrt(tiles * p * (1 - p))
        expect(Math.abs(systems.length - tiles * p)).toBeLessThan(5 * sigma)
    })

    test('nine kinds appear: six planet subtypes plus asteroid, nebula and ice field', () => {
        const kinds = new Set(
            systems.map((s) => (s.type === 1 ? `planet-${s.subtype}` : `type-${s.type}`))
        )
        expect([...kinds].sort()).toEqual(
            [
                'planet-0',
                'planet-1',
                'planet-2',
                'planet-3',
                'planet-4',
                'planet-5',
                'type-2',
                'type-3',
                'type-4',
            ].sort()
        )
    })

    test('type shares follow 96, 53, 53, 54 out of 256', () => {
        const want: Record<number, number> = {1: 96 / 256, 2: 53 / 256, 3: 53 / 256, 4: 54 / 256}
        for (const t of [1, 2, 3, 4]) {
            const n = systems.filter((s) => s.type === t).length
            const sigma = Math.sqrt(systems.length * want[t] * (1 - want[t]))
            expect(Math.abs(n - systems.length * want[t])).toBeLessThan(5 * sigma)
        }
    })

    test('size runs 500 to 65,535, skewed small, same for every type', () => {
        const sizes = systems.map((s) => s.size)
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(500)
        expect(Math.max(...sizes)).toBeLessThanOrEqual(65535)
        const below = (s: number) => sizes.filter((v) => v <= s).length / sizes.length
        for (const s of [2000, 8629, 22000, 50000]) {
            const want = Math.cbrt((s - 500) / 65035)
            expect(Math.abs(below(s) - want)).toBeLessThan(0.01)
        }
        const overall = sizes.reduce((a, b) => a + b, 0) / sizes.length
        for (const t of [1, 2, 3, 4]) {
            const xs = systems.filter((s) => s.type === t).map((s) => s.size)
            const m = xs.reduce((a, b) => a + b, 0) / xs.length
            expect(Math.abs(m - overall)).toBeLessThan(5 * (18400 / Math.sqrt(xs.length)))
        }
    })
})
