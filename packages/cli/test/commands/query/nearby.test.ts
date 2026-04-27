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

test('formatNearby with no opts produces unannotated output', () => {
    const out = formatNearby(nearby, {})
    expect(out).toContain('(0, 4)')
    expect(out).not.toContain('reachable')
    expect(out).not.toContain('OOD')
})

test('formatNearby without seeds skips annotation even if reach is provided', () => {
    const out = formatNearby(nearby, {reach: {depth: 100}})
    expect(out).toContain('(0, 4)')
    expect(out).toContain('Reach scope: gatherer depth 100')
})

test('formatNearby with showAll + reach still emits the cell line and legend', () => {
    const out = formatNearby(nearby, {reach: {depth: 100}, showAll: true})
    expect(out).toContain('(0, 4)')
    expect(out).toContain('OOD = out of depth')
})
