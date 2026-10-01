import {shuttleCandidates, type OwnedJob, type Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, parseUint64, parseUint64List} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {formatDateTimeUTC, formatDuration} from '../../lib/format'
import {getAccountName, transact} from '../../lib/session'
import type {EntityRowFetcher} from '../../lib/shuttle-candidates'
import {getEntityRow} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION, type WaitableOptions} from '../../lib/wait'
import {parseShuttledBy} from './craftjob'

export interface ClaimcraftOpts {
    entityId: bigint
    jobId: bigint
    shuttledBy?: bigint
}

export async function buildAction(opts: ClaimcraftOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.claimcraft(opts.jobId, opts.entityId, opts.shuttledBy)
}

export interface ClaimcraftCliOptions extends WaitableOptions {
    shuttledBy?: bigint | 'auto'
    candidates?: bigint[]
}

export async function findOwnedJob(sl: Shipload, jobId: bigint, player: string): Promise<OwnedJob> {
    const job = (await sl.jobs.getOwnedJobs(player)).find((j) => BigInt(j.id) === jobId)
    if (!job) {
        throw new ValidationError(
            `craft job ${jobId} is not one of ${player}'s jobs.`,
            "list a Workshop's jobs with: shiploadcli workshop <id> show"
        )
    }
    return job
}

export function assertClaimable(job: OwnedJob, now: Date): void {
    if (job.completesAt.getTime() <= now.getTime()) return
    const lead = Math.ceil((job.completesAt.getTime() - now.getTime()) / 1000)
    throw new ValidationError(
        `craft job ${job.id} finishes at ${formatDateTimeUTC(job.completesAt)}, in ${formatDuration(lead)}.`,
        'claim it once that time has passed.'
    )
}

export async function resolveAutoClaimShuttledBy(
    sl: Shipload,
    ctx: EntityContext,
    job: OwnedJob,
    candidateIds: bigint[],
    player: string,
    fetchRow: EntityRowFetcher = getEntityRow
): Promise<bigint | undefined> {
    const [buildingRow, owned, civicOwner] = await Promise.all([
        fetchRow(job.building),
        sl.entities.getEntities(player),
        sl.influence.getCivicOwner(),
    ])
    const ownRows = await Promise.all(owned.map((e) => fetchRow(BigInt(e.id.toString()))))
    const candidateRows = await Promise.all(candidateIds.map((id) => fetchRow(id)))
    const candidates = shuttleCandidates(
        {building: buildingRow, shipId: ctx.entityId, player},
        [...ownRows, ...candidateRows],
        civicOwner.toString()
    )
    const shuttleOptions = await sl.shuttle.claim({
        jobId: job.id,
        shipId: ctx.entityId,
        candidates: candidates.map((id) => BigInt(id)),
    })
    if (!shuttleOptions.auto) {
        throw new ValidationError(
            shuttleOptions.blocked?.reason ?? 'no shuttle can carry this claim.',
            "add a Depot id with --candidates, or drop --shuttled-by to use the building's own shuttle"
        )
    }
    return shuttleOptions.auto.shuttledBy !== undefined
        ? BigInt(shuttleOptions.auto.shuttledBy)
        : undefined
}

export async function runClaimcraft(
    ctx: EntityContext,
    jobId: bigint,
    options: ClaimcraftCliOptions
): Promise<void> {
    await withValidation(async () => {
        const sl = await getShipload()
        const player = getAccountName()
        const job = await findOwnedJob(sl, jobId, player)
        assertClaimable(job, new Date())
        const shuttledBy =
            options.shuttledBy === 'auto'
                ? await resolveAutoClaimShuttledBy(sl, ctx, job, options.candidates ?? [], player)
                : options.shuttledBy
        const action = await buildAction({entityId: ctx.entityId, jobId, shuttledBy}, sl)
        const result = await transact(
            {action},
            {description: `Claiming craft job ${jobId} from Workshop ${job.building}`}
        )
        await maybeAwaitAndPrint(ctx.entityId, options, result)
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'claimcraft',
    description: 'Collect the output of a finished Workshop craft job into cargo',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('claimcraft')
            .description('Collect the output of a finished Workshop craft job into cargo')
            .addHelpText(
                'before',
                'Requires: you own the job, the Fabricator has finished it, and this entity is ' +
                    'co-located with the Workshop and has cargo storage. Any entity you own can claim, ' +
                    'not only the one that booked the job. Claiming queues a pickup; the output ' +
                    'lands in cargo when that task resolves.\n'
            )
            .addHelpText(
                'after',
                `
Examples:
  # Claim job 42 into ship 1003
  shiploadcli ship 1003 claimcraft 42

  # Claim job 42 and let the chain pick the fastest shuttle
  shiploadcli ship 1003 claimcraft 42 --shuttled-by auto --wait

The job id is in the craftjob receipt and in \`shiploadcli workshop N show\`.`
            )
            .argument('<job-id>', 'craft job id from the craftjob receipt', parseUint64)
            .option(
                '--shuttled-by <id|auto>',
                'what shuttles the output: an entity id, a Depot id for its public bays, or auto ' +
                    "for the fastest; omitted uses the building's own shuttle",
                parseShuttledBy
            )
            .option(
                '--candidates <ids>',
                'Depot ids to consider for auto shuttling, comma separated. The CLI does not look up nearby Depots on its own.',
                parseUint64List
            )
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(async (jobId: bigint, rawOpts: ClaimcraftCliOptions) => {
                await runClaimcraft(ctx, jobId, rawOpts)
            }),
}
