import {expect, test} from 'bun:test'
import {Name} from '@wharfkit/antelope'
import type {OwnedJob, ServerTypes} from '@shipload/sdk'
import {
    assertClaimable,
    buildAction,
    findOwnedJob,
    resolveAutoClaimShuttledBy,
    SUBCOMMAND,
} from '../../../src/commands/action/claimcraft'
import {getLocalShipload} from '../../helpers/shipload'

const JOB = {id: 42, building: 1001} as OwnedJob

test('claimcraft builds action with job, ship and optional shuttle', async () => {
    const action = await buildAction(
        {entityId: 1003n, jobId: 42n, shuttledBy: 15n},
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('claimcraft')
    expect(action.account.toString()).toBe('eon.shipload')
    const decoded = action.decodeData(getLocalShipload().server.abi) as Record<string, unknown>
    expect(String(decoded.job_id)).toBe('42')
    expect(String(decoded.ship_id)).toBe('1003')
    expect(String(decoded.shuttled_by)).toBe('15')
})

test('claimcraft SUBCOMMAND takes a job id and the shuttle and wait options', () => {
    const cmd = SUBCOMMAND.build({entityType: 'ship', entityId: 1n})
    expect(cmd.name()).toBe('claimcraft')
    expect(cmd.registeredArguments.map((a) => a.name())).toEqual(['job-id'])
    const longs = cmd.options.map((o) => o.long)
    expect(longs).toEqual(['--shuttled-by', '--candidates', '--wait', '--track'])
})

test('findOwnedJob names the account and the lookup when the job is not theirs', async () => {
    const sl = getLocalShipload()
    sl.jobs.getOwnedJobs = (async () => [JOB]) as typeof sl.jobs.getOwnedJobs
    expect((await findOwnedJob(sl, 42n, 'eggmaple.gm')).building).toBe(1001)
    await expect(findOwnedJob(sl, 43n, 'eggmaple.gm')).rejects.toThrow(
        "craft job 43 is not one of eggmaple.gm's jobs."
    )
})

test('assertClaimable passes a finished job and names the finish time of an unfinished one', () => {
    const job = {...JOB, completesAt: new Date('2026-09-26T16:58:51Z')} as OwnedJob
    expect(() => assertClaimable(job, new Date('2026-09-26T16:58:51Z'))).not.toThrow()
    expect(() => assertClaimable(job, new Date('2026-09-26T16:58:12Z'))).toThrow(
        'craft job 42 finishes at 2026-09-26 16:58:51 UTC, in 39s.'
    )
})

test('resolveAutoClaimShuttledBy asks the SDK for claim options and returns the auto pick', async () => {
    const sl = getLocalShipload()
    const fetchRow = async (id: bigint | number) => {
        if (String(id) !== '1001') throw new Error(`unexpected fetchRow(${id})`)
        return {
            id: 1001,
            owner: 'eon.shipload',
            kind: 'workshop',
            item_id: 1,
            coordinates: {x: 0, y: 0},
        } as unknown as ServerTypes.entity_row
    }
    sl.entities.getEntities = (async () => []) as typeof sl.entities.getEntities
    sl.influence.getCivicOwner = (async () =>
        Name.from('eon.shipload')) as typeof sl.influence.getCivicOwner
    let claimReq: unknown
    sl.shuttle.claim = (async (req: unknown) => {
        claimReq = req
        return {
            options: [],
            auto: {shuttledBy: '900', mode: 'bays', hostId: '900', laneKey: 0, duration: 10},
        }
    }) as typeof sl.shuttle.claim
    const shuttledBy = await resolveAutoClaimShuttledBy(
        sl,
        {entityType: 'ship', entityId: 1003n},
        JOB,
        [],
        'eggmaple.gm',
        fetchRow
    )
    expect(shuttledBy).toBe(900n)
    expect(claimReq).toMatchObject({jobId: 42, shipId: 1003n})
})

test('resolveAutoClaimShuttledBy explains it when nothing can shuttle the claim', async () => {
    const sl = getLocalShipload()
    const fetchRow = async () =>
        ({
            id: 1001,
            owner: 'eon.shipload',
            kind: 'workshop',
            item_id: 1,
            coordinates: {x: 0, y: 0},
        }) as never
    sl.entities.getEntities = (async () => []) as typeof sl.entities.getEntities
    sl.influence.getCivicOwner = (async () =>
        Name.from('eon.shipload')) as typeof sl.influence.getCivicOwner
    sl.shuttle.claim = (async () => ({
        options: [],
        blocked: {code: 'not-ready', reason: 'job is not complete'},
    })) as typeof sl.shuttle.claim
    await expect(
        resolveAutoClaimShuttledBy(
            sl,
            {entityType: 'ship', entityId: 1003n},
            JOB,
            [],
            'eggmaple.gm',
            fetchRow
        )
    ).rejects.toThrow('job is not complete')
})
