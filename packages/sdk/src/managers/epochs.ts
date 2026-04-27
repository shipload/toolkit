import {UInt64, UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {EpochInfo, getCurrentEpoch, getEpochInfo} from '../scheduling/epoch'

export class EpochsManager extends BaseManager {
    async getCurrentHeight(): Promise<UInt64> {
        const game = await this.getGame()
        return getCurrentEpoch(game)
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
}
