import {
    jobCancelRoute,
    jobDeposited,
    jobsToLanes,
    jobStatus,
    jobStatusLabel,
    type JobCancelRoute,
    type JobWindow,
    schedule,
    ServerTypes,
    splitJobCargo,
} from '@shipload/sdk'
import type {Command} from 'commander'
import {parseUint64} from '../../lib/args'
import {getShipload, server} from '../../lib/client'
import {withValidation} from '../../lib/errors'
import {formatItem, formatOutput, formatTimeUTC} from '../../lib/format'
import {transact} from '../../lib/session'
import {getEntityRow, getEntitySnapshot} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'

export interface WorkshopShowView {
    workshopId: bigint
    socketCount: number
    jobs: JobWindow[]
}

function toJobWindow(r: ServerTypes.craftjob_row): JobWindow {
    const deposited = jobDeposited(r.deposited)
    const quantity = r.quantity.toNumber()
    return {
        id: r.id.toNumber(),
        socket: r.socket.toNumber(),
        owner: r.owner.toString(),
        startsAt: r.starts_at.toDate(),
        completesAt: r.completes_at.toDate(),
        recipeId: r.recipe_id.toNumber(),
        quantity,
        deposited,
        shipId: r.ship_id.toNumber(),
        inputs: splitJobCargo(r.cargo, deposited, quantity).inputs,
    }
}

export function renderWorkshopShow(view: WorkshopShowView, now: Date): string {
    const lines = [`Workshop ${view.workshopId}`]
    if (view.socketCount === 0) {
        lines.push('No Fabricator installed.')
        return lines.join('\n')
    }
    const lanes = jobsToLanes(view.jobs, view.socketCount, now)
    for (const lane of lanes) {
        const windows = lane.entries.filter((e) => e.kind === 'job' && e.job).map((e) => e.job!)
        const tail = windows[windows.length - 1]
        const state = tail ? `Booked until ${formatTimeUTC(tail.completesAt)}` : 'Open now'
        lines.push('')
        lines.push(`Fabricator ${lane.socket + 1} · ${state}`)
        if (windows.length === 0) continue
        lines.push(
            `  ${'job'.padEnd(6)}  ${'start'.padEnd(12)}  ${'done'.padEnd(12)}  ${'owner'.padEnd(13)}  ${'state'.padEnd(16)}  output`
        )
        for (const w of windows) {
            lines.push(
                `  ${String(w.id).padEnd(6)}  ${formatTimeUTC(w.startsAt).padEnd(12)}  ${formatTimeUTC(w.completesAt).padEnd(12)}  ${w.owner.padEnd(13)}  ${jobStatusLabel(jobStatus(w, now)).padEnd(16)}  ${formatItem(w.recipeId)}`
            )
        }
    }
    lines.push('')
    lines.push(
        `A job can be cancelled until the Fabricator starts on it: shiploadcli workshop ${view.workshopId} cancel <job>`
    )
    return lines.join('\n')
}

async function loadJobs(workshopId: bigint): Promise<JobWindow[]> {
    const raw = await server.readonly('getcraftjobs', {building_id: workshopId})
    const result = ServerTypes.craftjobs_result.from(raw as ServerTypes.craftjobs_result)
    return result.jobs.map(toJobWindow)
}

export async function loadWorkshopShow(workshopId: bigint): Promise<WorkshopShowView> {
    const snap = await getEntitySnapshot(workshopId)
    return {
        workshopId,
        socketCount: snap.crafter_lanes.length,
        jobs: await loadJobs(workshopId),
    }
}

export async function loadCancelRoute(
    workshopId: bigint,
    jobId: bigint,
    now: Date
): Promise<JobCancelRoute> {
    const job = (await loadJobs(workshopId)).find((j) => BigInt(j.id) === jobId)
    if (!job) {
        throw new ValidationError(
            `job ${jobId} is not on Workshop ${workshopId}.`,
            `list its jobs with: shiploadcli workshop ${workshopId} show`
        )
    }
    const tasks =
        job.deposited || job.shipId === undefined
            ? undefined
            : schedule.orderedTasks(await getEntityRow(job.shipId))
    const route = jobCancelRoute(job, now, tasks)
    if (!route) {
        throw new ValidationError(
            `job ${jobId} is ${jobStatusLabel(jobStatus(job, now, tasks))} and can no longer be cancelled.`,
            'a job cancels until the Fabricator starts on it'
        )
    }
    return route
}

async function runCancel(workshopId: bigint, jobId: bigint): Promise<void> {
    const route = await loadCancelRoute(workshopId, jobId, new Date())
    const sl = await getShipload()
    const via =
        route.kind === 'dropoff'
            ? `calling back the Drop-off on ship ${route.shipId}`
            : 'releasing its materials at the Workshop'
    await transact(
        {action: sl.actions.canceljob(route)},
        {description: `Cancelling craft job ${jobId} at Workshop ${workshopId}, ${via}`}
    )
}

export function register(program: Command): void {
    program
        .command('workshop')
        .description(
            'Workshop operations: `workshop <id> show` prints the Fabricator calendar, `workshop <id> cancel <job>` cancels one of your jobs before it starts crafting.'
        )
        .argument('<id>', 'entity id of the Workshop', parseUint64)
        .argument('[action]', 'show | cancel', 'show')
        .argument('[job]', 'craft job id, for cancel', parseUint64)
        .option('--json', 'emit JSON instead of formatted text')
        .action(
            async (
                id: bigint,
                action: string,
                job: bigint | undefined,
                options: {json?: boolean}
            ) => {
                await withValidation(async () => {
                    if (action === 'cancel') {
                        if (job === undefined) {
                            throw new ValidationError(
                                'cancel needs a job id.',
                                `shiploadcli workshop ${id} cancel <job>`
                            )
                        }
                        await runCancel(id, job)
                        return
                    }
                    if (action !== 'show') {
                        throw new Error(
                            `Unknown workshop action "${action}". Available: show, cancel`
                        )
                    }
                    const view = await loadWorkshopShow(id)
                    console.log(
                        formatOutput(view, {json: Boolean(options.json)}, (v) =>
                            renderWorkshopShow(v, new Date())
                        )
                    )
                })
            }
        )
}
