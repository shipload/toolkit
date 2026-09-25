import {
    HoldKind,
    hostedDropoff,
    jobCancelRoute,
    jobCancellationBlockReason,
    jobDeposited,
    jobsToLanes,
    jobStatus,
    jobStatusLabel,
    schedule,
    ServerTypes,
    splitJobCargo,
    type HostedLeg,
    type JobCancelRoute,
    type JobRouteOptions,
    type JobWindow,
    type OrderedTask,
    type ShuttleOptions,
} from '@shipload/sdk'
import type {Command} from 'commander'
import {
    parseCargoInput,
    parseUint16,
    parseUint32,
    parseUint64,
    parseUint64List,
} from '../../lib/args'
import {getShipload, gameContractName, server} from '../../lib/client'
import {withValidation} from '../../lib/errors'
import {formatDateTimeUTC, formatItem, formatOutput, formatTimeUTC, kvTable} from '../../lib/format'
import {transact} from '../../lib/session'
import {getEntityRow, getEntitySnapshot} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'

export interface WorkshopShowView {
    workshopId: bigint
    socketCount: number
    jobs: JobWindow[]
    hostedOptions?: Record<string, JobRouteOptions>
}

export type EntityRowFetcher = (id: bigint | number) => Promise<ServerTypes.entity_row>

async function resolveCivicOwner(): Promise<string> {
    const sl = await getShipload()
    return (await sl.influence.getCivicOwner()).toString()
}

export async function resolveHostedLeg(
    job: JobWindow,
    shipRow: ServerTypes.entity_row | undefined,
    fetchRow: EntityRowFetcher = getEntityRow,
    civicOwner: string = gameContractName
): Promise<JobRouteOptions | undefined> {
    if (!shipRow) return undefined
    const pullHoldIds = Array.from(
        new Set(
            (shipRow.holds ?? [])
                .filter((h) => h.kind.toNumber() === HoldKind.PULL)
                .map((h) => h.counterpart.entity_id.toString())
        )
    )
    if (pullHoldIds.length === 0) return undefined
    const hostRows = new Map<string, ServerTypes.entity_row>()
    for (const id of pullHoldIds) {
        try {
            hostRows.set(id, await fetchRow(BigInt(id)))
        } catch {}
    }
    const hosted: (HostedLeg & {task: OrderedTask}) | undefined = hostedDropoff(
        shipRow,
        (id) => hostRows.get(id),
        job,
        civicOwner
    )
    if (!hosted) return undefined
    const hostLaneLength = schedule
        .orderedTasks(hostRows.get(String(hosted.hostId)) ?? {lanes: []})
        .filter((t) => t.laneKey === hosted.laneKey).length
    return {hosted, hostedTask: hosted.task, hostLaneLength}
}

export function workshopCancelBlockMessage(
    job: JobWindow,
    tasks?: readonly OrderedTask[]
): string | null {
    switch (jobCancellationBlockReason(job, tasks)) {
        case 'legacy-inputs-unavailable':
            return 'This older Workshop job cannot be cancelled because its original inputs are unavailable. It will finish normally, and its output can still be claimed.'
        case 'ambiguous-dropoff':
            return 'Cannot identify which booking to cancel. Let the matching deliveries finish; the jobs will continue normally.'
        default:
            return null
    }
}

export function toJobWindow(r: ServerTypes.craftjob_row): JobWindow {
    const deposited = jobDeposited(r.deposited)
    const quantity = r.quantity.toNumber()
    return {
        id: r.id.toNumber(),
        socket: r.socket.toNumber(),
        owner: r.owner.toString(),
        startsAt: r.starts_at.toDate(),
        completesAt: r.completes_at.toDate(),
        arrivesAt: r.arrives_at.toDate(),
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
            const status = jobStatusLabel(
                jobStatus(w, now, undefined, view.hostedOptions?.[String(w.id)])
            )
            lines.push(
                `  ${String(w.id).padEnd(6)}  ${formatTimeUTC(w.startsAt).padEnd(12)}  ${formatTimeUTC(w.completesAt).padEnd(12)}  ${w.owner.padEnd(13)}  ${status.padEnd(16)}  ${formatItem(w.recipeId)}`
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

export async function loadWorkshopShow(
    workshopId: bigint,
    fetchRow: EntityRowFetcher = getEntityRow
): Promise<WorkshopShowView> {
    const snap = await getEntitySnapshot(workshopId)
    const jobs = await loadJobs(workshopId)
    const civicOwner = await resolveCivicOwner()
    const hostedOptions: Record<string, JobRouteOptions> = {}
    for (const job of jobs) {
        if (job.deposited !== false || job.shipId === undefined) continue
        let shipRow: ServerTypes.entity_row | undefined
        try {
            shipRow = await fetchRow(job.shipId)
        } catch {
            continue
        }
        const options = await resolveHostedLeg(job, shipRow, fetchRow, civicOwner)
        if (options) hostedOptions[String(job.id)] = options
    }
    return {
        workshopId,
        socketCount: snap.crafter_lanes.length,
        jobs,
        hostedOptions,
    }
}

export async function resolveCancelRoute(
    workshopId: bigint,
    job: JobWindow,
    now: Date,
    fetchRow: EntityRowFetcher = getEntityRow,
    civicOwner: string = gameContractName
): Promise<JobCancelRoute> {
    const shipRow =
        job.deposited || job.shipId === undefined ? undefined : await fetchRow(job.shipId)
    const tasks = shipRow ? schedule.orderedTasks(shipRow) : undefined
    const hostedOptions =
        job.deposited === false
            ? await resolveHostedLeg(job, shipRow, fetchRow, civicOwner)
            : undefined
    const blocked = workshopCancelBlockMessage(job, tasks)
    if (blocked) {
        throw new ValidationError(blocked, 'wait for the job to finish, then claim its output')
    }
    const route = jobCancelRoute(job, now, tasks, hostedOptions)
    if (!route) {
        throw new ValidationError(
            `job ${job.id} is ${jobStatusLabel(jobStatus(job, now, tasks, hostedOptions))} and can no longer be cancelled.`,
            'a job cancels until the Fabricator starts on it'
        )
    }
    return route
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
    return resolveCancelRoute(workshopId, job, now, getEntityRow, await resolveCivicOwner())
}

async function depotName(id: number): Promise<string> {
    try {
        const snap = await getEntitySnapshot(BigInt(id))
        return snap.entity_name?.trim() || `Depot ${id}`
    } catch {
        return `Depot ${id}`
    }
}

async function runCancel(workshopId: bigint, jobId: bigint): Promise<void> {
    const route = await loadCancelRoute(workshopId, jobId, new Date())
    const sl = await getShipload()
    const via =
        route.kind === 'dropoff'
            ? `calling back the Drop-off on ship ${route.shipId}`
            : route.kind === 'civic'
              ? `calling back the Drop-off from ${await depotName(route.buildingId)}`
              : 'releasing its materials at the Workshop'
    await transact(
        {action: sl.actions.canceljob(route)},
        {description: `Cancelling craft job ${jobId} at Workshop ${workshopId}, ${via}`}
    )
}

export interface ShuttleOptionsView {
    workshopId: bigint
    shipId: bigint
    recipeId: number
    quantity: number
    result: ShuttleOptions
}

function shuttleOptionLabel(o: ShuttleOptions['options'][number]): string {
    return o.shuttledBy
        ? `${o.mode} ${o.hostId} (shuttled by ${o.shuttledBy})`
        : `${o.mode} ${o.hostId}`
}

export function renderShuttleOptions(view: ShuttleOptionsView): string {
    const header = `Shuttle options for recipe ${view.recipeId} x${view.quantity} at Workshop ${view.workshopId}`
    if (view.result.blocked) {
        return [header, '', `Blocked: ${view.result.blocked.reason}`].join('\n')
    }
    if (view.result.options.length === 0) {
        return [header, '', 'No shuttle can carry this booking.'].join('\n')
    }
    const rows: [string, string][] = view.result.options.map((o) => {
        const label = shuttleOptionLabel(o) + (view.result.auto === o ? '  [auto]' : '')
        const detail = o.blocked ? o.blocked.reason : `finish ${formatDateTimeUTC(o.finish)}`
        return [label, detail]
    })
    return [header, '', kvTable(rows)].join('\n')
}

export async function loadShuttleOptions(
    workshopId: bigint,
    shipId: bigint,
    recipeId: number,
    quantity: number,
    inputs: {itemId: number; stackId: bigint; quantity: number}[],
    candidates: bigint[],
    recharge: boolean
): Promise<ShuttleOptionsView> {
    const sl = await getShipload()
    const cargoInputs = inputs.map((i) =>
        ServerTypes.cargo_item.from({
            item_id: i.itemId,
            quantity: i.quantity,
            stats: i.stackId,
            modules: [],
        })
    )
    const result = await sl.shuttle.craft({
        shipId,
        workshopId,
        recipeId,
        quantity,
        inputs: cargoInputs,
        candidates,
        recharge,
    })
    return {workshopId, shipId, recipeId, quantity, result}
}

export function register(program: Command): void {
    program
        .command('workshop')
        .description(
            'Workshop operations: `workshop <id> show` prints the Fabricator calendar, `workshop <id> cancel <job>` cancels one of your jobs before it starts crafting, `workshop <id> shuttle-options` lists what can carry cargo to a craft booking.'
        )
        .argument('<id>', 'entity id of the Workshop', parseUint64)
        .argument('[action]', 'show | cancel | shuttle-options', 'show')
        .argument(
            '[rest...]',
            'cancel: <job>. shuttle-options: <item-id>:<stack-id>:<qty> recipe inputs, repeatable.'
        )
        .option('--json', 'emit JSON instead of formatted text')
        .option(
            '--ship <id>',
            'entity id of the ship booking the job, for shuttle-options',
            parseUint64
        )
        .option(
            '--recipe <id>',
            'output item id from the recipe command, for shuttle-options',
            parseUint16
        )
        .option(
            '--quantity <n>',
            'number of times to run the recipe, for shuttle-options',
            parseUint32
        )
        .option(
            '--candidates <ids>',
            'Depot ids to consider for shuttling, comma separated. The CLI does not look up nearby Depots on its own.',
            parseUint64List
        )
        .option(
            '--recharge',
            'allow the pick to recharge partway through its leg, for shuttle-options'
        )
        .action(
            async (
                id: bigint,
                action: string,
                rest: string[],
                options: {
                    json?: boolean
                    ship?: bigint
                    recipe?: number
                    quantity?: number
                    candidates?: bigint[]
                    recharge?: boolean
                }
            ) => {
                await withValidation(async () => {
                    if (action === 'cancel') {
                        const job = rest[0] !== undefined ? parseUint64(rest[0]) : undefined
                        if (job === undefined) {
                            throw new ValidationError(
                                'cancel needs a job id.',
                                `shiploadcli workshop ${id} cancel <job>`
                            )
                        }
                        await runCancel(id, job)
                        return
                    }
                    if (action === 'shuttle-options') {
                        const usage = `shiploadcli workshop ${id} shuttle-options --ship <id> --recipe <id> --quantity <n> <input...>`
                        if (options.ship === undefined) {
                            throw new ValidationError('shuttle-options needs --ship.', usage)
                        }
                        if (options.recipe === undefined) {
                            throw new ValidationError('shuttle-options needs --recipe.', usage)
                        }
                        if (options.quantity === undefined) {
                            throw new ValidationError('shuttle-options needs --quantity.', usage)
                        }
                        const inputs = rest.map(parseCargoInput)
                        const view = await loadShuttleOptions(
                            id,
                            options.ship,
                            options.recipe,
                            options.quantity,
                            inputs,
                            options.candidates ?? [],
                            Boolean(options.recharge)
                        )
                        console.log(
                            formatOutput(view.result, {json: Boolean(options.json)}, () =>
                                renderShuttleOptions(view)
                            )
                        )
                        return
                    }
                    if (action !== 'show') {
                        throw new Error(
                            `Unknown workshop action "${action}". Available: show, cancel, shuttle-options`
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
