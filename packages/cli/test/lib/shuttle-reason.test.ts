import {expect, test} from 'bun:test'
import type {ShuttleReason} from '@shipload/sdk'
import {formatShuttleReason} from '../../src/lib/shuttle-reason'

const BANNED = /\b(host|lane|loader|carrier|socket)\b/i

test('formatShuttleReason prints the energy values for a ship-energy rejection', () => {
    const reason: ShuttleReason = {
        code: 'ship-energy',
        reason: 'Craft requires more energy than entity has.',
        have: 40,
        need: 65,
    }
    const out = formatShuttleReason(reason)
    expect(out).toBe('This job needs 65 energy; the ship will have 40.')
    expect(out).not.toMatch(BANNED)
})

test('formatShuttleReason prints the cap for a job-cap rejection', () => {
    const reason: ShuttleReason = {
        code: 'job-cap',
        reason: 'too many bookings waiting on materials at this building',
        cap: 4,
    }
    expect(formatShuttleReason(reason)).toBe(
        'This building already has the maximum of 4 bookings waiting on materials; let one finish first.'
    )
})

test('formatShuttleReason prints the opening time for a bays-booked rejection', () => {
    const reason: ShuttleReason = {
        code: 'bays-booked',
        reason: "the building's shuttle bays are fully booked",
        at: new Date('2026-09-15T13:10:00Z'),
    }
    const out = formatShuttleReason(reason)
    expect(out).toContain('2026-09-15 13:10:00 UTC')
    expect(out).not.toMatch(BANNED)
})

test('formatShuttleReason prints both times for a departs rejection', () => {
    const reason: ShuttleReason = {
        code: 'departs',
        reason: 'ship departs before the shuttle completes',
        at: new Date('2026-09-15T13:00:00Z'),
        until: new Date('2026-09-15T13:10:00Z'),
    }
    const out = formatShuttleReason(reason)
    expect(out).toContain('departs at 2026-09-15 13:00:00 UTC')
    expect(out).toContain('finishes at 2026-09-15 13:10:00 UTC')
    expect(out).not.toMatch(BANNED)
})

test('formatShuttleReason distinguishes workshop vs dock for not-equipped', () => {
    expect(
        formatShuttleReason({code: 'not-equipped', reason: 'workshop has no fabricator installed'})
    ).toBe('The Workshop has no Fabricator installed.')
    expect(
        formatShuttleReason({code: 'not-equipped', reason: 'dock has no assembly arm installed'})
    ).toBe('The Dock has no assembly arm installed.')
})

test('formatShuttleReason prints masses for a depot-full rejection', () => {
    const reason: ShuttleReason = {
        code: 'depot-full',
        reason: 'player storage allowance at this depot is exceeded',
        have: 100,
        need: 50,
        cap: 120,
    }
    const out = formatShuttleReason(reason)
    expect(out).not.toMatch(BANNED)
    expect(out).toMatch(/limit for one player/)
})

test('formatShuttleReason never emits the banned words for any known code', () => {
    const codes: ShuttleReason[] = [
        {code: 'workshop-capped', reason: ''},
        {code: 'ship-capped', reason: ''},
        {code: 'no-generator', reason: ''},
        {code: 'target-busy', reason: ''},
        {code: 'cargo-wont-fit', reason: ''},
        {code: 'not-stored', reason: ''},
        {code: 'no-storage', reason: ''},
        {code: 'player-cap', reason: ''},
        {code: 'queue-full', reason: ''},
        {code: 'inputs-unavailable', reason: ''},
        {code: 'dropoff-collision', reason: ''},
        {code: 'cargo-not-aboard', reason: ''},
        {code: 'no-capacity', reason: ''},
        {code: 'schedule-full', reason: ''},
        {code: 'plot-recipe', reason: 'No recipe found for plot target.'},
        {code: 'not-ready', reason: ''},
    ]
    for (const reason of codes) {
        expect(formatShuttleReason(reason)).not.toMatch(BANNED)
    }
})
