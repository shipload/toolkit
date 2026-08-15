import {Int64, Name, type NameType, UInt64} from '@wharfkit/antelope'
import {BaseManager} from './base'
import type {ServerContract} from '../contracts'
import {coordsToLocationId, type CoordinatesType} from '../types'
import {
    citizenryName,
    contributeDuration,
    decayActive,
    deriveDemand,
    pricingFromWeights,
    valueCargoItem,
    type DemandTriple,
    type DemandView,
    type ValuedItem,
} from '../influence'
import {getItem} from '../data/catalog'

export interface InfluenceStanding {
    epoch: number
    playerLifetime: bigint
    playerActive: bigint
    standingLifetime: bigint
    standingActive: bigint
    locationLifetime: bigint
    locationActive: bigint
    watermark: bigint
    direction: number
    founder: Name
    founded: number
}

export interface CharterProgress {
    locationId: bigint
    lifetime: bigint
    watermark: bigint
    surplus: bigint
    direction: number
    nextCost: bigint
    prereqsMet: boolean
    buildable: boolean
    epoch: number
    built: {nodeId: number; completedEpoch: number; entityId: bigint}[]
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
    lifetime: bigint
    active: bigint
    watermark: bigint
    direction: number
    directionEpoch: number
    founder: Name
    founded: number
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
            playerLifetime: big(result.player_lifetime),
            playerActive: big(result.player_active),
            standingLifetime: big(result.standing_lifetime),
            standingActive: big(result.standing_active),
            locationLifetime: big(result.location_lifetime),
            locationActive: big(result.location_active),
            watermark: big(result.watermark),
            direction: Number(result.direction),
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
            watermark: big(result.watermark),
            surplus: big(result.surplus),
            direction: Number(result.direction),
            nextCost: big(result.next_cost),
            prereqsMet: Boolean(result.prereqs_met),
            buildable: Boolean(result.buildable),
            epoch: Number(result.epoch),
            built: result.built.map((b) => ({
                nodeId: Number(b.node_id),
                completedEpoch: Number(b.completed_epoch),
                entityId: big(b.entity_id),
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

    async getFoundedWorlds(): Promise<FoundedWorld[]> {
        const rows = (await this.server.table('infloc').all()) as ServerContract.Types.infloc_row[]
        const epoch = (await this.getState()).epoch
        return rows.map((row) => ({
            locationId: big(row.location_id),
            lifetime: big(row.lifetime),
            active: decayActive(
                big(row.active),
                Math.max(0, Number(epoch) - Number(row.last_update_epoch))
            ),
            watermark: big(row.watermark),
            direction: Number(row.direction),
            directionEpoch: Number(row.direction_epoch),
            founder: Name.from(row.founder),
            founded: Number(row.founded),
        }))
    }

    async isFounded(location: CoordinatesType): Promise<boolean> {
        const id = coordsToLocationId(location)
        const row = await this.server.table('infloc').get(UInt64.from(id))
        return row !== undefined
    }
}
