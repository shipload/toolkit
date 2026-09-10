import {Int64, Name, type NameType, UInt64} from '@wharfkit/antelope'
import {BaseManager} from './base'
import type {ServerContract} from '../contracts'
import {coordsToLocationId, locationIdToCoords, type CoordinatesType} from '../types'
import {
    type BuiltCharter,
    type WorldBuilding,
    citizenryName,
    contributeDuration,
    decayActive,
    deriveDemand,
    pricingFromWeights,
    valueCargoItem,
    type DemandTriple,
    type DemandView,
    isCivicEntity,
    type ValuedItem,
} from '../influence'
import {getItem} from '../data/catalog'

export interface InfluenceStanding {
    epoch: number
    standingLifetime: bigint
    standingActive: bigint
    citizenshipLifetime: bigint
    citizenshipActive: bigint
    locationLifetime: bigint
    locationActive: bigint
    spent: bigint
    mandate: number
    founder: Name
    founded: number
}

export interface CharterProgress {
    locationId: bigint
    lifetime: bigint
    spent: bigint
    unassigned: bigint
    mandate: number
    nextCost: bigint
    prereqsMet: boolean
    buildable: boolean
    epoch: number
    built: BuiltCharter[]
    ballotId: bigint
    settling: boolean
    queue: QueuedSeat[]
    progress: NodeProgress[]
}

export interface NodeProgress {
    nodeId: number
    amount: bigint
}

export interface ContributePreviewRow {
    itemId: number
    quantity: number
    stats: bigint
    valueAtomic: bigint
    massKg: number
}

export interface ContributePreview {
    rows: ContributePreviewRow[]
    totalAtomic: bigint
    totalMassKg: number
    durationSeconds: number
    demand: DemandView
}

export interface FoundedWorld {
    locationId: bigint
    x: number
    y: number
    lifetime: bigint
    active: bigint
    spent: bigint
    ballotId: bigint
    mandate: number | undefined
    founder: Name
    founded: number
}

export interface FoundedWorldRef {
    x: number
    y: number
    mandate: number
}

export interface VoteOption {
    nodeId: number
    cost: bigint
    seat: number
    weight: bigint
    rank: number
}

export interface VoteStandings {
    locationId: bigint
    ballotId: bigint
    epoch: number
    settledEpoch: number
    seats: number
    settling: boolean
    queue: number[]
    options: VoteOption[]
    picks: number[]
}

export interface BallotVote {
    account: Name
    picks: number[]
}

export interface Ballot {
    ballotId: bigint
    kind: number
    subject: bigint
    seats: number
    settledEpoch: number
    queue: number[]
    round: number
    settling: boolean
}

export interface QueuedSeat {
    nodeId: number
    cost: bigint
    progress: bigint
    gap: bigint
}

function big(value: unknown): bigint {
    return BigInt(String(value))
}

export class InfluenceManager extends BaseManager {
    async getStanding(owner: NameType, location: CoordinatesType): Promise<InfluenceStanding> {
        const result = (await this.server.readonly('getinfluence', {
            owner: Name.from(owner),
            x: Int64.from(location.x),
            y: Int64.from(location.y),
        })) as ServerContract.Types.influence_totals

        return {
            epoch: Number(result.epoch),
            standingLifetime: big(result.standing_lifetime),
            standingActive: big(result.standing_active),
            citizenshipLifetime: big(result.citizenship_lifetime),
            citizenshipActive: big(result.citizenship_active),
            locationLifetime: big(result.location_lifetime),
            locationActive: big(result.location_active),
            spent: big(result.spent),
            mandate: Number(result.mandate),
            founder: Name.from(result.founder),
            founded: Number(result.founded),
        }
    }

    async getDemandConfig(): Promise<DemandTriple> {
        const row = (await this.server.table('infdemand').get()) as
            | ServerContract.Types.infdemand_row
            | undefined
        if (!row) throw new Error('influence demand config is unset')
        return {peak: big(row.peak), base: big(row.base), floor: big(row.floor)}
    }

    async getQualityDivisor(): Promise<number> {
        const row = (await this.server.table('infquality').get()) as
            | ServerContract.Types.infquality_row
            | undefined
        if (!row) throw new Error('influence quality config is unset')
        return Number(row.d1)
    }

    async getWeights(): Promise<ServerContract.Types.infweight_row[]> {
        return (await this.server.table('infweight').all()) as ServerContract.Types.infweight_row[]
    }

    async getDemand(location: CoordinatesType): Promise<DemandView> {
        const game = await this.getGame()
        const state = await this.getState()
        const triple = await this.getDemandConfig()
        return deriveDemand({
            gameSeed: game.config.seed,
            epochSeed: state.epochSeed,
            coordinates: location,
            triple,
        })
    }

    async getCivicOwner(): Promise<Name> {
        const row = (await this.server.table('civicconfig').get()) as
            | ServerContract.Types.civicconfig_row
            | undefined
        return row ? Name.from(row.civic_owner) : Name.from(this.server.account)
    }

    async isCivic(entity: {owner: NameType}): Promise<boolean> {
        return isCivicEntity(entity, await this.getCivicOwner())
    }

    async getCitizenryName(location: CoordinatesType): Promise<string | undefined> {
        const game = await this.getGame()
        return citizenryName(game.config.seed, location)
    }

    async previewContribution(
        location: CoordinatesType,
        bundle: ValuedItem[],
        opts: {altitudeZ?: number} = {}
    ): Promise<ContributePreview> {
        const [demand, d1, weights] = await Promise.all([
            this.getDemand(location),
            this.getQualityDivisor(),
            this.getWeights(),
        ])
        const pricing = pricingFromWeights(
            d1,
            weights.map((w) => ({
                category: Number(w.category),
                tier: Number(w.tier),
                weightFp: big(w.weight_fp),
            }))
        )

        let totalAtomic = 0n
        let totalMassKg = 0
        const rows = bundle.map((item) => {
            const valueAtomic = valueCargoItem(item, demand, pricing)
            const massKg = getItem(item.itemId).mass * item.quantity
            totalAtomic += valueAtomic
            totalMassKg += massKg
            return {...item, valueAtomic, massKg}
        })

        return {
            rows,
            totalAtomic,
            totalMassKg,
            durationSeconds: contributeDuration(totalMassKg, opts.altitudeZ ?? 0),
            demand,
        }
    }

    async getCharter(location: CoordinatesType): Promise<CharterProgress> {
        const result = (await this.server.readonly('getcharter', {
            x: Int64.from(location.x),
            y: Int64.from(location.y),
        })) as ServerContract.Types.charter_result

        return {
            locationId: big(result.location_id),
            lifetime: big(result.lifetime),
            spent: big(result.spent),
            unassigned: big(result.unassigned),
            mandate: Number(result.mandate),
            nextCost: big(result.next_cost),
            prereqsMet: Boolean(result.prereqs_met),
            buildable: Boolean(result.buildable),
            epoch: Number(result.epoch),
            built: result.built.map((b) => ({
                nodeId: Number(b.node_id),
                repeats: Number(b.repeats),
            })),
            ballotId: big(result.ballot_id),
            settling: Boolean(result.settling),
            queue: result.queue.map((seat) => ({
                nodeId: Number(seat.node_id),
                cost: big(seat.cost),
                progress: big(seat.progress),
                gap: big(seat.gap),
            })),
            progress: result.progress.map((p) => ({
                nodeId: Number(p.node_id),
                amount: big(p.amount),
            })),
        }
    }

    async getPools(): Promise<ServerContract.Types.pool_view[]> {
        const result = (await this.server.readonly('getpools')) as ServerContract.Types.pools_result
        return result.pools
    }

    async getPool(category: number, tier: number): Promise<ServerContract.Types.pool_pair_result> {
        return (await this.server.readonly('getpool', {
            category,
            tier,
        })) as ServerContract.Types.pool_pair_result
    }

    async getMintConfig(): Promise<ServerContract.Types.mintcfg_result> {
        return (await this.server.readonly('getmintcfg')) as ServerContract.Types.mintcfg_result
    }

    async getMintReady(): Promise<number> {
        return Number(await this.server.readonly('getmintready'))
    }

    async getVoteReady(): Promise<number> {
        return Number(await this.server.readonly('getvoteready'))
    }

    async getCharterReady(): Promise<FoundedWorldRef[]> {
        const result = (await this.server.readonly(
            'getchrtready'
        )) as ServerContract.Types.charterready_result
        return result.worlds.map((w) => ({
            x: Number(w.x),
            y: Number(w.y),
            mandate: Number(w.mandate),
        }))
    }

    async getVotes(location: CoordinatesType, player?: NameType): Promise<VoteStandings> {
        const result = (await this.server.readonly('getvotes', {
            x: Int64.from(location.x),
            y: Int64.from(location.y),
            player: Name.from(player ?? ''),
        })) as ServerContract.Types.vote_result

        return {
            locationId: big(result.location_id),
            ballotId: big(result.ballot_id),
            epoch: Number(result.epoch),
            settledEpoch: Number(result.settled_epoch),
            seats: Number(result.seats),
            settling: Boolean(result.settling),
            queue: result.queue.map((n) => Number(n)),
            options: result.options.map((option) => ({
                nodeId: Number(option.node_id),
                cost: big(option.cost),
                seat: Number(option.seat),
                weight: big(option.weight),
                rank: Number(option.rank),
            })),
            picks: result.picks.map((n) => Number(n)),
        }
    }

    async getBallotId(location: CoordinatesType): Promise<bigint | undefined> {
        const row = (await this.server
            .table('worlds')
            .get(UInt64.from(coordsToLocationId(location)))) as
            | ServerContract.Types.worlds_row
            | undefined
        return row ? big(row.ballot_id) : undefined
    }

    async getBallot(ballotId: bigint): Promise<Ballot | undefined> {
        const row = (await this.server.table('ballot').get(UInt64.from(ballotId))) as
            | ServerContract.Types.ballot_row
            | undefined
        if (!row) return undefined
        const epoch = Number((await this.getState()).epoch)
        const settledEpoch = Number(row.settled_epoch)
        return {
            ballotId: big(row.ballot_id),
            kind: Number(row.kind),
            subject: big(row.subject),
            seats: Number(row.seats),
            settledEpoch,
            queue: row.queue.map((n) => Number(n)),
            round: Number(row.round),
            settling: settledEpoch < epoch,
        }
    }

    async getBallotVotes(ballotId: bigint): Promise<BallotVote[]> {
        const rows = (await this.server
            .table('ballotvote', UInt64.from(ballotId))
            .all()) as ServerContract.Types.ballotvote_row[]
        return rows.map((row) => ({
            account: Name.from(row.account),
            picks: row.picks.map((n) => Number(n)),
        }))
    }

    async getBuiltCharters(location: CoordinatesType): Promise<BuiltCharter[]> {
        const rows = (await this.server
            .table('mandates', coordsToLocationId(location))
            .all()) as ServerContract.Types.mandates_row[]
        return rows.map((row) => ({nodeId: Number(row.node_id), repeats: Number(row.repeats)}))
    }

    async getBuildings(location: CoordinatesType): Promise<WorldBuilding[]> {
        const rows = (await this.server
            .table('buildings', coordsToLocationId(location))
            .all()) as ServerContract.Types.buildings_row[]
        return rows.map((row) => ({entityId: big(row.entity_id), building: Number(row.building)}))
    }

    async getFoundedWorlds(opts: {withMandate?: boolean} = {}): Promise<FoundedWorld[]> {
        const rows = (await this.server.table('worlds').all()) as ServerContract.Types.worlds_row[]
        const epoch = (await this.getState()).epoch
        const worlds = rows.map((row) => ({
            locationId: big(row.location_id),
            ...locationIdToCoords(row.location_id),
            lifetime: big(row.lifetime),
            active: decayActive(
                big(row.active),
                Math.max(0, Number(epoch) - Number(row.active_epoch))
            ),
            spent: big(row.spent),
            ballotId: big(row.ballot_id),
            mandate: undefined as number | undefined,
            founder: Name.from(row.founder),
            founded: Number(row.founded),
        }))

        if (!opts.withMandate) return worlds

        for (const world of worlds) {
            world.mandate = (await this.getCharter({x: world.x, y: world.y})).mandate
        }
        return worlds
    }

    async isFounded(location: CoordinatesType): Promise<boolean> {
        const id = coordsToLocationId(location)
        const row = await this.server.table('worlds').get(UInt64.from(id))
        return row !== undefined
    }
}
