import {type Action, Int64, Name, type NameType, UInt32, UInt8} from '@wharfkit/antelope'
import {BaseManager} from './base'
import type {ServerContract} from '../contracts'
import type {CoordinatesType} from '../types'

export const CIVIC_FP_SCALE = 1_000_000_000n

export interface CitizenShare {
    locationId: bigint
    x: number
    y: number
    active: bigint
    worldActive: bigint
    readyFp: bigint
    ready: bigint
    pendingFp: bigint
}

export interface CitizenShares {
    epoch: number
    shares: CitizenShare[]
}

export interface WorldProduction {
    locationId: bigint
    epoch: number
    production: bigint
    rateFp: bigint
    earningsFp: bigint
    worldActive: bigint
    lastEpoch: number
    lastEarningsFp: bigint
}

export interface WorldEarnings {
    epoch: number
    closed: boolean
    earningsFp: bigint
    scaledFp: bigint
    total: bigint
}

export interface CivicEpoch {
    epoch: number
    opened: boolean
    announced: boolean
    window: number
    samples: number
    clampMinBp: number
    clampMaxBp: number
    estimate: bigint
    target: bigint
    rateFp: bigint
    production: bigint
    creditedFp: bigint
}

export interface EmissionEpoch {
    epoch: number
    target: bigint
    committed: bigint
    uncommitted: bigint
    scaledBack: bigint
    rateFp: bigint
    production: bigint
    supply: bigint
    owed: bigint
}

export interface EmissionBand {
    below: bigint
    perEpoch: bigint
}

export interface EmissionCurve {
    bands: EmissionBand[]
    rampEpochs: number
}

export interface EmissionHandover {
    epoch: number
    supply: bigint
    owed: bigint
}

export interface EmissionSeries {
    handover: EmissionHandover | null
    curve: EmissionCurve | null
    supply: bigint | null
    owed: bigint | null
    rows: EmissionEpoch[]
    nextFrom: number | null
}

type Wire<T> = {[K in keyof T as T[K] extends (...args: never[]) => unknown ? never : K]: unknown}

export interface WireEmissionEpoch {
    epoch: unknown
    target: unknown
    committed: unknown
    uncommitted: unknown
    scaled_back: unknown
    rate_fp: unknown
    production: unknown
    supply: unknown
    owed: unknown
}

function big(value: unknown): bigint {
    return BigInt(String(value))
}

export function parseCitizenShares(
    raw: Wire<ServerContract.Types.shares_result> & {shares: unknown[]}
): CitizenShares {
    return {
        epoch: Number(raw.epoch),
        shares: raw.shares.map((value) => {
            const share = value as Wire<ServerContract.Types.share_view>
            return {
                locationId: big(share.location_id),
                x: Number(share.x),
                y: Number(share.y),
                active: big(share.active),
                worldActive: big(share.world_active),
                readyFp: big(share.ready_fp),
                ready: big(share.ready),
                pendingFp: big(share.pending_fp),
            }
        }),
    }
}

export function parseWorldProduction(
    raw: Wire<ServerContract.Types.world_production>
): WorldProduction {
    return {
        locationId: big(raw.location_id),
        epoch: Number(raw.epoch),
        production: big(raw.production),
        rateFp: big(raw.rate_fp),
        earningsFp: big(raw.earnings_fp),
        worldActive: big(raw.world_active),
        lastEpoch: Number(raw.last_epoch),
        lastEarningsFp: big(raw.last_earnings_fp),
    }
}

export function parseWorldEarnings(raw: {rows: unknown[]}): WorldEarnings[] {
    return raw.rows.map((value) => {
        const row = value as Wire<ServerContract.Types.earnings_view>
        return {
            epoch: Number(row.epoch),
            closed: Boolean(row.closed),
            earningsFp: big(row.earnings_fp),
            scaledFp: big(row.scaled_fp),
            total: big(row.total),
        }
    })
}

export function parseCivicEpoch(raw: Wire<ServerContract.Types.civicepoch_row>): CivicEpoch {
    return {
        epoch: Number(raw.epoch),
        opened: Boolean(raw.opened),
        announced: Boolean(raw.announced),
        window: Number(raw.window),
        samples: Number(raw.samples),
        clampMinBp: Number(raw.clamp_min_bp),
        clampMaxBp: Number(raw.clamp_max_bp),
        estimate: big(raw.estimate),
        target: big(raw.target),
        rateFp: big(raw.rate_fp),
        production: big(raw.production),
        creditedFp: big(raw.credited_fp),
    }
}

export function parseEmissionEpoch(raw: WireEmissionEpoch): EmissionEpoch {
    return {
        epoch: Number(raw.epoch),
        target: big(raw.target),
        committed: big(raw.committed),
        uncommitted: big(raw.uncommitted),
        scaledBack: big(raw.scaled_back),
        rateFp: big(raw.rate_fp),
        production: big(raw.production),
        supply: big(raw.supply),
        owed: big(raw.owed),
    }
}

interface WireEmissionSeries {
    handover?: {epoch: unknown; supply: unknown; owed: unknown} | null
    curve?: {bands: {below: unknown; per_epoch: unknown}[]; ramp_epochs: unknown} | null
    supply?: unknown
    owed?: unknown
    rows: WireEmissionEpoch[]
    next_from?: unknown
}

export function parseEmissionSeries(raw: WireEmissionSeries): EmissionSeries {
    return {
        handover: raw.handover
            ? {
                  epoch: Number(raw.handover.epoch),
                  supply: big(raw.handover.supply),
                  owed: big(raw.handover.owed),
              }
            : null,
        curve: raw.curve
            ? {
                  bands: raw.curve.bands.map((band) => ({
                      below: big(band.below),
                      perEpoch: big(band.per_epoch),
                  })),
                  rampEpochs: Number(raw.curve.ramp_epochs),
              }
            : null,
        supply: raw.supply == null ? null : big(raw.supply),
        owed: raw.owed == null ? null : big(raw.owed),
        rows: raw.rows.map(parseEmissionEpoch),
        nextFrom: typeof raw.next_from === 'number' ? raw.next_from : null,
    }
}

export class SharesManager extends BaseManager {
    async getShares(player: NameType): Promise<CitizenShares> {
        const result = (await this.server.readonly('getshares', {
            player: Name.from(player),
        })) as ServerContract.Types.shares_result
        return parseCitizenShares(result)
    }

    async getWorldProduction(location: CoordinatesType): Promise<WorldProduction> {
        const result = (await this.server.readonly('getworldprod', {
            x: Int64.from(location.x),
            y: Int64.from(location.y),
        })) as ServerContract.Types.world_production
        return parseWorldProduction(result)
    }

    async getEarnings(
        location: CoordinatesType,
        opts: {fromEpoch?: number; limit?: number} = {}
    ): Promise<WorldEarnings[]> {
        const result = (await this.server.readonly('getearnings', {
            x: Int64.from(location.x),
            y: Int64.from(location.y),
            from_epoch: UInt32.from(opts.fromEpoch ?? 0),
            limit: UInt8.from(opts.limit ?? 0),
        })) as ServerContract.Types.earnings_result
        return parseWorldEarnings(result)
    }

    // Epoch 0 reads the open epoch.
    async getCivicEpoch(epoch = 0): Promise<CivicEpoch> {
        const result = (await this.server.readonly('getemitepoch', {
            epoch: UInt32.from(epoch),
        })) as ServerContract.Types.civicepoch_row
        return parseCivicEpoch(result)
    }

    async collect(player: NameType, location: CoordinatesType): Promise<Action[]> {
        return this.context.actions.collectTx(player, location, {
            open: await this.missingBalanceRow(player),
        })
    }

    async collectAll(player: NameType): Promise<Action[]> {
        const {shares} = await this.getShares(player)
        if (!shares.some((share) => share.ready > 0n)) return []
        return this.context.actions.collectAllTx(player, shares, {
            open: await this.missingBalanceRow(player),
        })
    }

    private async missingBalanceRow(player: NameType) {
        const config = await this.context.balances.getDepositConfig()
        if (!config) throw new Error('the platform has no deposit token configured')
        const row = await this.context.balances.getPlatformBalance(player, config.tokenContract)
        return row ? undefined : config
    }
}
