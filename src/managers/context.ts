import {APIClient} from '@wharfkit/antelope'
import {Contract} from '@wharfkit/contract'
import {PlatformContract} from '../contracts'
import {GameState} from '../entities/gamestate'

import {EntitiesManager} from './entities'
import {PlayersManager} from './players'
import {LocationsManager} from './locations'
import {TradesManager} from './trades'
import {EpochsManager} from './epochs'
import {ActionsManager} from './actions'

export class GameContext {
    private _entities?: EntitiesManager
    private _players?: PlayersManager
    private _locations?: LocationsManager
    private _trades?: TradesManager
    private _epochs?: EpochsManager
    private _actions?: ActionsManager

    private _gameCache?: PlatformContract.Types.game_row
    private _stateCache?: GameState

    constructor(
        public readonly client: APIClient,
        public readonly server: Contract,
        public readonly platform: Contract
    ) {}

    get entities(): EntitiesManager {
        if (!this._entities) {
            this._entities = new EntitiesManager(this)
        }
        return this._entities
    }

    get players(): PlayersManager {
        if (!this._players) {
            this._players = new PlayersManager(this)
        }
        return this._players
    }

    get locations(): LocationsManager {
        if (!this._locations) {
            this._locations = new LocationsManager(this)
        }
        return this._locations
    }

    get trades(): TradesManager {
        if (!this._trades) {
            this._trades = new TradesManager(this)
        }
        return this._trades
    }

    get epochs(): EpochsManager {
        if (!this._epochs) {
            this._epochs = new EpochsManager(this)
        }
        return this._epochs
    }

    get actions(): ActionsManager {
        if (!this._actions) {
            this._actions = new ActionsManager(this)
        }
        return this._actions
    }

    async getGame(reload = false): Promise<PlatformContract.Types.game_row> {
        if (!reload && this._gameCache) {
            return this._gameCache
        }
        const game = await this.platform.table('games').get()
        if (!game) {
            throw new Error('Game not initialized')
        }
        this._gameCache = game
        return game
    }

    async getState(reload = false): Promise<GameState> {
        if (!reload && this._stateCache) {
            return this._stateCache
        }
        const state = await this.server.table('state').get()
        if (!state) {
            throw new Error('Game state not initialized')
        }
        const game = this._gameCache
        this._stateCache = GameState.from(state, game)
        return this._stateCache
    }

    get cachedGame(): PlatformContract.Types.game_row | undefined {
        return this._gameCache
    }

    get cachedState(): GameState | undefined {
        return this._stateCache
    }
}
