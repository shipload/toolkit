import {expect, test} from 'bun:test'
import type {JobWindow} from '@shipload/sdk'
import {renderWorkshopShow} from '../../../src/commands/query/workshop'

const at = (s: string) => new Date(s)
const win = (over: Partial<JobWindow>): JobWindow => ({
    id: 1,
    socket: 0,
    owner: 'eggmaple.gm',
    startsAt: at('2026-09-15T14:00:00Z'),
    completesAt: at('2026-09-15T15:10:00Z'),
    recipeId: 10001,
    quantity: 1,
    deposited: true,
    ...over,
})

test('renderWorkshopShow prints one block per Fabricator with its windows in schedule order', () => {
    const now = at('2026-09-15T13:00:00Z')
    const jobs = [
        win({
            id: 2,
            socket: 1,
            startsAt: at('2026-09-15T14:00:00Z'),
            completesAt: at('2026-09-15T15:10:00Z'),
        }),
        win({
            id: 1,
            socket: 1,
            owner: 'other.gm',
            startsAt: at('2026-09-15T13:00:00Z'),
            completesAt: at('2026-09-15T14:00:00Z'),
        }),
    ]
    const out = renderWorkshopShow({workshopId: 1001n, socketCount: 2, jobs}, now)
    const lines = out.split('\n')
    expect(lines[0]).toBe('Workshop 1001')
    expect(lines).toContain('Fabricator 1 · Open now')
    expect(lines).toContain('Fabricator 2 · Booked until 15:10:00 UTC')
    const idx = lines.indexOf('Fabricator 2 · Booked until 15:10:00 UTC')
    expect(lines[idx + 1]).toMatch(/^ {2}start\s+done\s+owner\s+output$/)
    expect(lines[idx + 2]).toMatch(/^ {2}13:00:00 UTC\s+14:00:00 UTC\s+other\.gm/)
    expect(lines[idx + 3]).toMatch(/^ {2}14:00:00 UTC\s+15:10:00 UTC\s+eggmaple\.gm/)
})

test('renderWorkshopShow omits ended windows', () => {
    const now = at('2026-09-15T16:00:00Z')
    const jobs = [win({})]
    const out = renderWorkshopShow({workshopId: 1001n, socketCount: 1, jobs}, now)
    expect(out).toContain('Fabricator 1 · Open now')
    expect(out).not.toContain('eggmaple.gm')
})

test('renderWorkshopShow says when no Fabricator is installed', () => {
    const out = renderWorkshopShow(
        {workshopId: 1001n, socketCount: 0, jobs: []},
        at('2026-09-15T16:00:00Z')
    )
    expect(out).toContain('No Fabricator installed.')
})
