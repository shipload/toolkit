import {expect, test} from 'bun:test'
import {formatNearby} from '../../../src/lib/format'

// biome-ignore lint/suspicious/noExplicitAny: nearby_info stub
const nearby: any = {
    current: {coordinates: {x: 0n, y: 0n}, energy: 350},
    projected: {coordinates: {x: 0n, y: 0n}, energy: 350},
    max_energy: 350,
    can_travel: true,
    systems: [
        {
            location: {coords: {x: 0n, y: 4n}, is_system: true},
            distance: 80,
            energy_cost: 172,
            flight_time: 80,
        },
    ],
}

test('formatNearby without opts shows the system row', () => {
    const out = formatNearby(nearby, {})
    expect(out).toContain('(0, 4)')
    expect(out).toContain('172/350')
    expect(out).toContain('1m 20s')
})

test('formatNearby without seeds still surfaces the reachable legend when reach is provided', () => {
    const out = formatNearby(nearby, {reach: {depth: 100}})
    expect(out).toContain('(0, 4)')
    expect(out).toContain('Reachable:')
    expect(out).toContain('depth ≤ gatherer (100)')
})

test('formatNearby with includeOOD extends the legend with the OOD note', () => {
    const out = formatNearby(nearby, {reach: {depth: 100}, expand: true, includeOOD: true})
    expect(out).toContain('(0, 4)')
    expect(out).toContain('Includes out-of-depth (OOD) strata.')
})

test('formatNearby --top trims output and notes the truncation in the heading', () => {
    const out = formatNearby(nearby, {top: 1})
    expect(out).toContain('Nearby (1')
})

test('formatNearby --json emits a parseable structure with travel metrics', () => {
    const out = formatNearby(nearby, {json: true})
    const parsed = JSON.parse(out)
    expect(parsed.systems).toHaveLength(1)
    expect(parsed.systems[0].coords).toEqual({x: 0, y: 4})
    expect(parsed.systems[0].energy_cost).toBe(172)
    expect(parsed.systems[0].flight_time_s).toBe(80)
})
