import {jobDeposited, jobsToLanes, type JobWindow, ServerTypes} from '@shipload/sdk'
import type {Command} from 'commander'
import {parseUint64} from '../../lib/args'
import {server} from '../../lib/client'
import {withValidation} from '../../lib/errors'
import {formatItem, formatOutput, formatTimeUTC} from '../../lib/format'
import {getEntitySnapshot} from '../../lib/snapshot'

export interface WorkshopShowView {
    workshopId: bigint
    socketCount: number
    jobs: JobWindow[]
}

function toJobWindow(r: ServerTypes.craftjob_row): JobWindow {
    return {
        id: r.id.toNumber(),
        socket: r.socket.toNumber(),
        owner: r.owner.toString(),
        startsAt: r.starts_at.toDate(),
        completesAt: r.completes_at.toDate(),
        recipeId: r.recipe_id.toNumber(),
        quantity: r.quantity.toNumber(),
        deposited: jobDeposited(r.deposited),
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
        lines.push(`  ${'start'.padEnd(12)}  ${'done'.padEnd(12)}  ${'owner'.padEnd(13)}  output`)
        for (const w of windows) {
            lines.push(
                `  ${formatTimeUTC(w.startsAt).padEnd(12)}  ${formatTimeUTC(w.completesAt).padEnd(12)}  ${w.owner.padEnd(13)}  ${formatItem(w.recipeId)}`
            )
        }
    }
    return lines.join('\n')
}

export async function loadWorkshopShow(workshopId: bigint): Promise<WorkshopShowView> {
    const snap = await getEntitySnapshot(workshopId)
    const raw = await server.readonly('getcraftjobs', {building_id: workshopId})
    const result = ServerTypes.craftjobs_result.from(raw as ServerTypes.craftjobs_result)
    return {
        workshopId,
        socketCount: snap.crafter_lanes.length,
        jobs: result.jobs.map(toJobWindow),
    }
}

export function register(program: Command): void {
    program
        .command('workshop')
        .description('Workshop operations: `workshop <id> show` prints the Fabricator calendar.')
        .argument('<id>', 'entity id of the Workshop', parseUint64)
        .argument('[action]', 'show', 'show')
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (id: bigint, action: string, options: {json?: boolean}) => {
            await withValidation(async () => {
                if (action !== 'show') {
                    throw new Error(`Unknown workshop action "${action}". Available: show`)
                }
                const view = await loadWorkshopShow(id)
                console.log(
                    formatOutput(view, {json: Boolean(options.json)}, (v) =>
                        renderWorkshopShow(v, new Date())
                    )
                )
            })
        })
}
