import {UInt64, type UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {type EpochInfo, getCurrentEpoch, getEpochInfo} from '../scheduling/epoch'
import type {ServerContract} from '../contracts'

export class EpochsManager extends BaseManager {
    async getCurrentHeight(): Promise<UInt64> {
        const game = await this.getGame()
        return getCurrentEpoch(game)
    }

    async getFinalizedEpoch(reload = false): Promise<UInt64> {
        const state = await this.getState(reload)
        return state.currentEpoch
    }

    async getCurrent(): Promise<EpochInfo> {
        const game = await this.getGame()
        const epoch = await this.getCurrentHeight()
        return getEpochInfo(game, epoch)
    }

    async getByHeight(height: UInt64Type): Promise<EpochInfo> {
        const game = await this.getGame()
        return getEpochInfo(game, UInt64.from(height))
    }

    async getTimeRemaining(): Promise<number> {
        const epochInfo = await this.getCurrent()
        const now = Date.now()
        const endTime = epochInfo.end.getTime()
        return Math.max(0, endTime - now)
    }

    async getProgress(): Promise<number> {
        const epochInfo = await this.getCurrent()
        const now = Date.now()
        const startTime = epochInfo.start.getTime()
        const endTime = epochInfo.end.getTime()
        const duration = endTime - startTime
        const elapsed = now - startTime

        if (elapsed <= 0) return 0
        if (elapsed >= duration) return 1

        return elapsed / duration
    }

    async fitsInCurrentEpoch(durationMs: number): Promise<boolean> {
        const remaining = await this.getTimeRemaining()
        return durationMs <= remaining
    }

    async getEpochRow(epoch: UInt64Type): Promise<ServerContract.Types.epoch_row | undefined> {
        const target = UInt64.from(epoch)
        return this.server.table('epoch').get(target)
    }

    async getActiveEpochInfo(): Promise<ServerContract.Types.epoch_row | undefined> {
        const rows = await this.server.table('epoch').all()
        if (rows.length === 0) {
            return undefined
        }
        return rows[rows.length - 1]
    }

    async getOracles(): Promise<ServerContract.Types.oracle_row[]> {
        return this.server.table('oracles').all()
    }

    async getThreshold(): Promise<number> {
        const cfg = await this.server.table('oraclecfg').get()
        return cfg ? Number(cfg.threshold) : 0
    }

    async getCommitsFor(epoch: UInt64Type): Promise<ServerContract.Types.commit_row[]> {
        const target = UInt64.from(epoch)
        const rows = await this.server.table('commit').all()
        return rows.filter((r) => r.epoch.equals(target))
    }

    async getRevealsFor(epoch: UInt64Type): Promise<ServerContract.Types.reveal_row[]> {
        const target = UInt64.from(epoch)
        const rows = await this.server.table('reveal').all()
        return rows.filter((r) => r.epoch.equals(target))
    }
}
