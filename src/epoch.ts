import {UInt64} from '@wharfkit/antelope'
import {PlatformContract} from './contracts'

export interface EpochInfo {
    epoch: UInt64
    start: Date
    end: Date
}

export function getCurrentEpoch(game: PlatformContract.Types.game_row): UInt64 {
    const current = new Date().getTime()
    const difference = (current - game.config.start.toMilliseconds()) / 1000
    const epoch = Math.floor(difference / Number(game.config.epochtime)) + 1
    return UInt64.from(epoch)
}

export function getEpochInfo(game: PlatformContract.Types.game_row, epoch: UInt64): EpochInfo {
    const start = game.config.start.toMilliseconds()
    const epochtime = Number(game.config.epochtime)
    const epochstart = start + (Number(epoch) - 1) * epochtime * 1000
    const epochend = epochstart + epochtime * 1000
    return {
        epoch,
        start: new Date(epochstart),
        end: new Date(epochend),
    }
}
