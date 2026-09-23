import {describe, expect, test} from 'bun:test'
import {HoldKind, ServerContract, TaskType, type JobWindow} from '@shipload/sdk'
import {
    renderWorkshopShow,
    resolveCancelRoute,
    resolveHostedLeg,
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

test('renderWorkshopShow reads a bay-hosted undeposited window as Booked, not Dropping off', () => {
    const now = at('2026-09-15T13:00:00Z')
    const job = win({id: 3, deposited: false})
    const out = renderWorkshopShow(
        {
            workshopId: 1001n,
            socketCount: 1,
            jobs: [job],
            hostedOptions: {
                '3': {
                    hosted: {hostId: 900, laneKey: 1, taskIndex: 0, civic: true},
                    hostedTask: {
                        laneKey: 1,
                        taskIndex: 0,
                        startsAt: at('2026-09-15T13:30:00Z'),
                        completesAt: at('2026-09-15T13:45:00Z'),
                        task: {} as never,
                    },
                },
            },
        },
        now
    )
    expect(out).toMatch(/eggmaple\.gm\s+Booked/)
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

describe('bay-hosted craft drop-offs (no network: fetchRow is injected)', () => {
    const laneStarted = at('2026-09-15T13:00:00Z')
    const legDuration = 900

    function fixture() {
        const job: JobWindow = win({
            id: 42,
            deposited: false,
            shipId: 5,
            arrivesAt: new Date(laneStarted.getTime() + legDuration * 1000),
            inputs: [{item_id: 101, quantity: 10, stats: 0, modules: []}] as never,
        })
        const shipRow = ServerContract.Types.entity_row.from({
            id: 5,
            owner: 'alice.gm',
            kind: 'ship',
            item_id: 1,
            name: 'Test Ship',
            stats: 0,
            coordinates: {x: 0, y: 0},
            cargomass: 0,
            modules: [],
            lanes: [],
            holds: [
                {
                    id: 1,
                    kind: HoldKind.PULL,
                    counterpart: {entity_id: 900, entity_type: 'depot'},
                    until: 0,
                    incoming_mass: 0,
                },
            ],
        } as never)
        const depositTask = ServerContract.Types.task.from({
            type: TaskType.CIVIC_DEPOSIT,
            duration: legDuration,
            cancelable: 2,
            cargo: [{item_id: 101, quantity: 10, stats: 0, modules: []}],
            couplings: [
                {counterpart: {entity_id: 5, entity_type: 'ship'}, hold: 1, kind: HoldKind.PULL},
            ],
        } as never)
        const hostRow = ServerContract.Types.entity_row.from({
            id: 900,
            owner: 'eon.shipload',
            kind: 'depot',
            item_id: 2,
            name: 'Depot',
            stats: 0,
            coordinates: {x: 0, y: 0},
            cargomass: 0,
            modules: [],
            lanes: [{lane_key: 1, schedule: {started: laneStarted, tasks: [depositTask]}}],
            holds: [],
        } as never)
        const fetchRow = async (id: bigint | number) => {
            if (BigInt(id) === 900n) return hostRow
            if (BigInt(id) === 5n) return shipRow
            throw new Error(`unexpected fetchRow(${id})`)
        }
        return {job, shipRow, hostRow, fetchRow}
    }

    test('resolveHostedLeg finds the bay leg through the ship PULL hold, with no network', async () => {
        const {job, shipRow, fetchRow} = fixture()
        const options = await resolveHostedLeg(job, shipRow, fetchRow)
        expect(options?.hosted?.hostId).toBe(900)
        expect(options?.hosted?.laneKey).toBe(1)
        expect(options?.hosted?.civic).toBe(true)
        expect(options?.hostLaneLength).toBe(1)
        expect(options?.hostedTask?.completesAt).toEqual(job.arrivesAt)
    })

    test('resolveHostedLeg finds nothing for a ship with no PULL hold', async () => {
        const {job, fetchRow} = fixture()
        const shipRowNoHold = ServerContract.Types.entity_row.from({
            id: 5,
            owner: 'alice.gm',
            kind: 'ship',
            item_id: 1,
            name: 'Test Ship',
            stats: 0,
            coordinates: {x: 0, y: 0},
            cargomass: 0,
            modules: [],
            lanes: [],
            holds: [],
        } as never)
        expect(await resolveHostedLeg(job, shipRowNoHold, fetchRow)).toBeUndefined()
    })

    test('resolveCancelRoute emits the civic cancel route for a bay-hosted drop-off', async () => {
        const {job, fetchRow} = fixture()
        const route = await resolveCancelRoute(1001n, job, laneStarted, fetchRow)
        expect(route).toEqual({kind: 'civic', buildingId: 900, laneKey: 1, fromId: 5})
    })

    test('resolveHostedLeg reads the civic owner from its explicit argument, not a hardcoded contract name', async () => {
        const {job, shipRow, fetchRow} = fixture()
        const asDeployedOwner = await resolveHostedLeg(job, shipRow, fetchRow, 'eon.shipload')
        expect(asDeployedOwner?.hosted?.civic).toBe(true)
        const asOtherOwner = await resolveHostedLeg(job, shipRow, fetchRow, 'someoneelse.gm')
        expect(asOtherOwner?.hosted?.civic).toBe(false)
    })

    test('renderWorkshopShow reads the same bay-hosted job as Booked using resolveHostedLeg output', async () => {
        const {job, shipRow, fetchRow} = fixture()
        const options = await resolveHostedLeg(job, shipRow, fetchRow)
        const beforeLegStarts = new Date(laneStarted.getTime() - 5 * 60_000)
        const out = renderWorkshopShow(
            {
                workshopId: 1001n,
                socketCount: 1,
                jobs: [job],
                hostedOptions: {[String(job.id)]: options!},
            },
            beforeLegStarts
        )
        expect(out).toMatch(/eggmaple\.gm\s+Booked/)
    })
})
