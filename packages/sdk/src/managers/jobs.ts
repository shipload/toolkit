import {Name, UInt64, type NameType, type UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {
    jobDeposited,
    jobStatus,
    splitJobCargo,
    type BuildJob,
    type OwnedJob,
} from '../scheduling/jobs'
import type {ServerContract} from '../contracts'

type JobRow = ServerContract.Types.craftjob_row
type BuildJobRow = ServerContract.Types.buildjob_row

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

    async getBuildJobs(dockId: UInt64Type, opts?: {now?: Date}): Promise<BuildJob[]> {
        const now = opts?.now ?? new Date()
        const result = (await this.server.readonly('getbuildjobs', {
            building_id: UInt64.from(dockId),
        })) as ServerContract.Types.buildjobs_result | undefined
        return (result?.jobs ?? []).map((r) => this.parseBuildJob(r, now))
    }

    private parseBuildJob(r: BuildJobRow, now: Date): BuildJob {
        const startsAt = r.starts_at.toDate()
        const completesAt = r.completes_at.toDate()
        const arrivesAt = r.arrives_at.toDate()
        const deposited = jobDeposited(r.deposited)
        const building = r.building.toNumber()
        const inputs = [...r.cargo]
        return {
            id: r.id.toNumber(),
            building,
            socket: r.socket.toNumber(),
            targetId: r.target.toNumber(),
            owner: r.owner.toString(),
            coords: {x: r.coords.x.toNumber(), y: r.coords.y.toNumber()},
            startsAt,
            completesAt,
            arrivesAt,
            targetItemId: r.target_item_id.toNumber(),
            status: jobStatus({startsAt, completesAt, arrivesAt, deposited, building, inputs}, now),
            deposited,
            inputs,
        }
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
