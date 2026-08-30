import {describe, expect, test} from 'bun:test'
import {
    MAINTENANCE_IDLE_LINE,
    planLogged,
    planMaintenanceLog,
    type MaintenanceLogState,
    type SweepOutcome,
} from './maintenance-log'

const HEARTBEAT = 30 * 60 * 1000

const MINTED_LINE = 'mint sweep: 3 pool(s) ready'
const SETTLED_LINE = 'ballot sweep: settled 2 due ballot(s) (max 10)'
const FAILED_LINE = 'fund sweep failed: reached account cpu limit'

const idle: SweepOutcome = {kind: 'idle'}
const minted: SweepOutcome = {kind: 'productive', line: MINTED_LINE}
const settled: SweepOutcome = {kind: 'productive', line: SETTLED_LINE}
const broke: SweepOutcome = {kind: 'failed', line: FAILED_LINE}

function state(loggedAt: number): MaintenanceLogState {
    return {loggedAt}
}

describe('planMaintenanceLog', () => {
    test('an all-idle pass collapses to one line on the first run', () => {
        const plan = planMaintenanceLog([idle, idle, idle, idle], null, 0, HEARTBEAT)
        expect(plan.out).toEqual([MAINTENANCE_IDLE_LINE])
        expect(plan.err).toEqual([])
    })

    test('an all-idle pass inside the heartbeat window stays silent', () => {
        const plan = planMaintenanceLog([idle, idle, idle, idle], state(0), 10_000, HEARTBEAT)
        expect(plan.out).toEqual([])
        expect(plan.err).toEqual([])
    })

    test('the heartbeat prints an idle line once the window elapses', () => {
        const plan = planMaintenanceLog([idle, idle, idle, idle], state(0), HEARTBEAT, HEARTBEAT)
        expect(plan.out).toEqual([MAINTENANCE_IDLE_LINE])
    })

    test('a productive sweep prints alone, without its idle neighbours', () => {
        const plan = planMaintenanceLog([minted, idle, idle, idle], state(0), 10_000, HEARTBEAT)
        expect(plan.out).toEqual([MINTED_LINE])
        expect(plan.err).toEqual([])
    })

    test('a productive sweep suppresses the idle line even at the heartbeat boundary', () => {
        const plan = planMaintenanceLog([minted, idle, idle, idle], state(0), HEARTBEAT, HEARTBEAT)
        expect(plan.out).not.toContain(MAINTENANCE_IDLE_LINE)
    })

    test('a failure always prints, and goes to stderr', () => {
        const plan = planMaintenanceLog([idle, idle, idle, broke], state(0), 10_000, HEARTBEAT)
        expect(plan.out).toEqual([])
        expect(plan.err).toEqual([FAILED_LINE])
    })

    test('a failure is never hidden behind an idle collapse', () => {
        const plan = planMaintenanceLog([idle, idle, idle, broke], state(0), 10_000, HEARTBEAT)
        expect(plan.out).not.toContain(MAINTENANCE_IDLE_LINE)
    })

    test('productive and failed sweeps both print in one pass', () => {
        const plan = planMaintenanceLog([minted, idle, idle, broke], state(0), 10_000, HEARTBEAT)
        expect(plan.out).toHaveLength(1)
        expect(plan.err).toHaveLength(1)
    })

    test('multiple productive sweeps keep their order', () => {
        const plan = planMaintenanceLog([minted, settled, idle, idle], state(0), 10_000, HEARTBEAT)
        expect(plan.out).toEqual([MINTED_LINE, SETTLED_LINE])
    })
})

describe('planLogged', () => {
    test('a silent plan does not advance the heartbeat', () => {
        expect(planLogged({out: [], err: []})).toBe(false)
    })

    test('an idle line advances the heartbeat', () => {
        expect(planLogged({out: [MAINTENANCE_IDLE_LINE], err: []})).toBe(true)
    })

    test('a productive pass advances the heartbeat, so no idle line follows it', () => {
        expect(planLogged({out: ['mint sweep: 1 pool(s) ready'], err: []})).toBe(true)
    })

    test('a failure alone advances the heartbeat', () => {
        expect(planLogged({out: [], err: ['fund sweep failed: nope']})).toBe(true)
    })
})
