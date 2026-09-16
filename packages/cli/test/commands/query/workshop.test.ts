import {expect, test} from 'bun:test'
import type {JobWindow} from '@shipload/sdk'
import {
    renderWorkshopShow,
    toJobWindow,
    workshopCancelBlockMessage,
} from '../../../src/commands/query/workshop'

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

test('toJobWindow preserves arrival and complete input identity for cancellation matching', () => {
    const cargo = [
        {
            item_id: 101,
            stats: '413333752',
            modules: [{type: 1, installed: {item_id: 301, stats: '9'}}],
            quantity: 10,
            entity_id: '77',
        },
    ]
    const number = (value: number) => ({toNumber: () => value})
    const date = (value: string) => ({toDate: () => at(value)})
    const job = toJobWindow({
        id: number(2),
        socket: number(0),
        owner: {toString: () => 'eggmaple.gm'},
        starts_at: date('2026-09-15T14:00:00Z'),
        completes_at: date('2026-09-15T15:00:00Z'),
        arrives_at: date('2026-09-15T13:45:00Z'),
        recipe_id: number(10001),
        quantity: number(1),
        deposited: false,
        ship_id: number(5),
        cargo,
    } as never)
    expect(job.arrivesAt).toEqual(at('2026-09-15T13:45:00Z'))
    expect(job.inputs).toEqual(cargo as never)
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
    expect(lines[idx + 1]).toMatch(/^ {2}job\s+start\s+done\s+owner\s+state\s+output$/)
    expect(lines[idx + 2]).toMatch(/^ {2}1\s+13:00:00 UTC\s+14:00:00 UTC\s+other\.gm\s+Crafting/)
    expect(lines[idx + 3]).toMatch(/^ {2}2\s+14:00:00 UTC\s+15:10:00 UTC\s+eggmaple\.gm\s+Queued/)
})

test('renderWorkshopShow names the cancel command and the rule it follows', () => {
    const out = renderWorkshopShow(
        {workshopId: 1001n, socketCount: 1, jobs: [win({})]},
        at('2026-09-15T13:00:00Z')
    )
    expect(out).toContain('until the Fabricator starts on it')
    expect(out).toContain('shiploadcli workshop 1001 cancel <job>')
})

test('renderWorkshopShow reads an undeposited window as Dropping off', () => {
    const out = renderWorkshopShow(
        {workshopId: 1001n, socketCount: 1, jobs: [win({deposited: false})]},
        at('2026-09-15T13:00:00Z')
    )
    expect(out).toMatch(/eggmaple\.gm\s+Dropping off/)
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

test('legacy output-only jobs explain that cancellation is unavailable while preserving claim', () => {
    expect(workshopCancelBlockMessage(win({inputs: []}))).toContain(
        'will finish normally, and its output can still be claimed'
    )
    expect(workshopCancelBlockMessage(win({inputs: undefined}))).toBeNull()
    expect(workshopCancelBlockMessage(win({inputs: [{item_id: 101}] as never}))).toBeNull()
    expect(workshopCancelBlockMessage(win({inputs: [], quantity: 0}))).toBeNull()
    expect(workshopCancelBlockMessage(win({inputs: [], deposited: false}))).toBeNull()
})
