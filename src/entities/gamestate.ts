import {Checksum256, Int64, UInt64} from '@wharfkit/antelope'
import {PlatformContract, ServerContract} from '../contracts'
import {EpochInfo, getCurrentEpoch, getEpochInfo} from '../scheduling/epoch'
import {hasSystem} from '../utils/system'

/**
 * GameState class extends the state_row from the server contract
 * with helper methods for epoch management and system generation
 */
export class GameState extends ServerContract.Types.state_row {
    private _game?: PlatformContract.Types.game_row

    /**
     * Create a GameState instance from a state_row
     */
    static from(
        state: ServerContract.Types.state_row,
        game?: PlatformContract.Types.game_row
    ): GameState {
        const gameState = Object.create(GameState.prototype) as GameState
        Object.assign(gameState, state)
        gameState._game = game
        return gameState
    }

    /**
     * Set the game configuration (needed for epoch calculations)
     */
    setGame(game: PlatformContract.Types.game_row): void {
        this._game = game
    }

    /**
     * Get the current epoch number from the state
     */
    get currentEpoch(): UInt64 {
        return this.epoch
    }

    /**
     * Get the epoch seed (used for market pricing and system generation)
     */
    get epochSeed(): Checksum256 {
        return this.seed
    }

    /**
     * Get the game seed (from game config, if available)
     */
    get gameSeed(): Checksum256 | undefined {
        return this._game?.config.seed
    }

    /**
     * Check if the game is currently enabled
     */
    get isEnabled(): boolean {
        return this.enabled
    }

    /**
     * Get the total number of ships in the game
     */
    get shipCount(): number {
        return Number(this.ships)
    }

    /**
     * Get the current salt value (used for random number generation)
     */
    get currentSalt(): UInt64 {
        return this.salt
    }

    /**
     * Get the commit hash for the next epoch
     */
    get nextEpochCommit(): Checksum256 {
        return this.commit
    }

    /**
     * Calculate the current epoch from game config (if game is set)
     * This might differ from state.epoch if the blockchain hasn't advanced yet
     */
    get calculatedCurrentEpoch(): UInt64 | undefined {
        if (!this._game) {
            return undefined
        }
        return getCurrentEpoch(this._game)
    }

    /**
     * Get epoch info (start/end times) for the current epoch
     */
    get currentEpochInfo(): EpochInfo | undefined {
        if (!this._game) {
            return undefined
        }
        return getEpochInfo(this._game, this.epoch)
    }

    /**
     * Get epoch info for a specific epoch number
     */
    getEpochInfo(epoch: UInt64): EpochInfo | undefined {
        if (!this._game) {
            return undefined
        }
        return getEpochInfo(this._game, epoch)
    }

    /**
     * Check if a system exists at given coordinates
     * Requires game seed from game config
     */
    hasSystemAt(x: number, y: number): boolean {
        if (!this._game) {
            return false
        }
        return hasSystem(this._game.config.seed, {x: Int64.from(x), y: Int64.from(y)})
    }

    /**
     * Check if a system exists at coordinates object
     */
    hasSystemAtCoords(coords: ServerContract.Types.coordinates): boolean {
        if (!this._game) {
            return false
        }
        return hasSystem(this._game.config.seed, coords)
    }

    /**
     * Get a summary of the game state
     */
    get summary(): {
        enabled: boolean
        epoch: string
        ships: number
        hasSeed: boolean
        hasCommit: boolean
    } {
        return {
            enabled: this.enabled,
            epoch: this.epoch.toString(),
            ships: this.shipCount,
            hasSeed: !this.seed.equals(Checksum256.from('0'.repeat(64))),
            hasCommit: !this.commit.equals(Checksum256.from('0'.repeat(64))),
        }
    }
}
