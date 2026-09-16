import {Name, type NameType} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {jobDeposited, jobStatus, splitJobCargo, type OwnedJob} from '../scheduling/jobs'
import type {ServerContract} from '../contracts'

type JobRow = ServerContract.Types.craftjob_row

export class JobsManager extends BaseManager {
    async getOwnedJobs(owner: NameType, opts?: {now?: Date}): Promise<OwnedJob[]> {
        const ownerName = Name.from(owner)
        const now = opts?.now ?? new Date()

        let rows: JobRow[]
        try {
            // index_position 'tertiary' = nodeos slot 3 = owner's secondary index; no ABI metadata for it.
            rows = (await this.server
                .table('craftjobs')
                .query({
                    index_position: 'tertiary',
                    key_type: 'i64',
                    from: ownerName.value,
                    to: ownerName.value,
                })
                .all()) as JobRow[]
        } catch {
            rows = (await this.server.table('craftjobs').all()) as JobRow[]
        }

        return rows.filter((r) => ownerName.equals(r.owner)).map((r) => this.parseOwnedJob(r, now))
    }

    private parseOwnedJob(r: JobRow, now: Date): OwnedJob {
        const startsAt = r.starts_at.toDate()
        const completesAt = r.completes_at.toDate()
        const arrivesAt = r.arrives_at.toDate()
        const deposited = jobDeposited(r.deposited)
        const quantity = r.quantity.toNumber()
        const building = r.building.toNumber()
        const {output, inputs} = splitJobCargo(r.cargo, deposited, quantity)
        return {
            id: r.id.toNumber(),
            building,
            socket: r.socket.toNumber(),
            shipId: r.ship_id.toNumber(),
            coords: {x: r.coords.x.toNumber(), y: r.coords.y.toNumber()},
            startsAt,
            completesAt,
            arrivesAt,
            recipeId: r.recipe_id.toNumber(),
            quantity,
            status: jobStatus({startsAt, completesAt, deposited, quantity, building, inputs}, now),
            deposited,
            output,
            inputs,
            outputStats: output?.stats === undefined ? undefined : BigInt(output.stats.toString()),
        }
    }
}
