import {Name, type NameType} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {jobStatus, splitJobCargo, type OwnedJob} from '../scheduling/jobs'
import type {ServerContract} from '../contracts'

type JobRow = ServerContract.Types.job_row

export class JobsManager extends BaseManager {
    async getOwnedJobs(owner: NameType, opts?: {now?: Date}): Promise<OwnedJob[]> {
        const ownerName = Name.from(owner)
        const now = opts?.now ?? new Date()

        let rows: JobRow[]
        try {
            // index_position 'tertiary' = nodeos slot 3 = owner's secondary index; no ABI metadata for it.
            rows = (await this.server
                .table('jobs')
                .query({
                    index_position: 'tertiary',
                    key_type: 'i64',
                    from: ownerName.value,
                    to: ownerName.value,
                })
                .all()) as JobRow[]
        } catch {
            rows = (await this.server.table('jobs').all()) as JobRow[]
        }

        return rows.filter((r) => ownerName.equals(r.owner)).map((r) => this.parseOwnedJob(r, now))
    }

    private parseOwnedJob(r: JobRow, now: Date): OwnedJob {
        const startsAt = r.starts_at.toDate()
        const completesAt = r.completes_at.toDate()
        const {output, inputs} = splitJobCargo(r.cargo)
        return {
            id: r.id.toNumber(),
            workshop: r.workshop.toNumber(),
            socket: r.socket.toNumber(),
            shipId: r.ship_id.toNumber(),
            coords: {x: r.coords.x.toNumber(), y: r.coords.y.toNumber()},
            startsAt,
            completesAt,
            recipeId: r.recipe_id.toNumber(),
            quantity: r.quantity.toNumber(),
            status: jobStatus({startsAt, completesAt}, now),
            output,
            inputs,
            outputStats: output?.stats === undefined ? undefined : BigInt(output.stats.toString()),
        }
    }
}
