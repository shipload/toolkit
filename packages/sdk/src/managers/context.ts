import type {APIClient} from '@wharfkit/antelope'
import type {Contract} from '@wharfkit/contract'
import type {PlatformContract} from '../contracts'
import {FundContract} from '../contracts'
import {GameState} from '../entities/gamestate'

import {EntitiesManager} from './entities'
import {PlayersManager} from './players'
import {LocationsManager} from './locations'
import {CoordinatesManager} from './coordinates'
import {EpochsManager} from './epochs'
import {ActionsManager} from './actions'
import {ClusterManager} from './cluster'
import {NftManager} from './nft'
import {BalancesManager} from './balances'
import {FundManager} from './fund'
import {JobsManager} from './jobs'
import {InfluenceManager} from './influence'
import {SubscriptionsManager} from '../subscriptions/manager'

export class GameContext {
    private _entities?: EntitiesManager
    private _players?: PlayersManager
    private _locations?: LocationsManager
    private _coordinates?: CoordinatesManager
    private _epochs?: EpochsManager
    private _actions?: ActionsManager
    private _clusters?: ClusterManager
    private _nft?: NftManager
    private _balances?: BalancesManager
    private _funds?: FundManager
    private _jobs?: JobsManager
    private _influence?: InfluenceManager
    private _subscriptions?: SubscriptionsManager
    private _subscriptionsUrl?: string

    private _gameCache?: PlatformContract.Types.game_row
    private _gameInflight?: Promise<PlatformContract.Types.game_row>
    private _stateCache?: GameState
    private _stateInflight?: Promise<GameState>

    constructor(
        public readonly client: APIClient,
        public readonly server: Contract,
        public readonly platform: Contract,
        public readonly atomicAssetsAccount: string = 'atomicassets',
        public readonly fund: Contract = new FundContract.Contract({client})
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

    get coordinates(): CoordinatesManager {
        if (!this._coordinates) {
            this._coordinates = new CoordinatesManager(this)
        }
        return this._coordinates
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

    get clusters(): ClusterManager {
        if (!this._clusters) {
            this._clusters = new ClusterManager(this)
        }
        return this._clusters
    }

    get nft(): NftManager {
        if (!this._nft) {
            this._nft = new NftManager(this)
        }
        return this._nft
    }

    get balances(): BalancesManager {
        if (!this._balances) {
            this._balances = new BalancesManager(this)
        }
        return this._balances
    }

    get funds(): FundManager {
        if (!this._funds) {
            this._funds = new FundManager(this)
        }
        return this._funds
    }

    get jobs(): JobsManager {
        if (!this._jobs) {
            this._jobs = new JobsManager(this)
        }
        return this._jobs
    }

    get influence(): InfluenceManager {
        if (!this._influence) {
            this._influence = new InfluenceManager(this)
        }
        return this._influence
    }

    setSubscriptionsUrl(url: string) {
        this._subscriptionsUrl = url
    }

    get subscriptions(): SubscriptionsManager {
        if (!this._subscriptions) {
            if (!this._subscriptionsUrl) {
                throw new Error(
                    'subscriptions requires a subscriptionsUrl passed to Shipload constructor'
                )
            }
            this._subscriptions = new SubscriptionsManager({url: this._subscriptionsUrl})
        }
        return this._subscriptions
    }

    async getGame(reload = false): Promise<PlatformContract.Types.game_row> {
        if (!reload && this._gameCache) {
            return this._gameCache
        }
        if (!reload && this._gameInflight) {
            return this._gameInflight
        }
        const inflight = (async () => {
            const game = await this.platform.table('games').get()
            if (!game) {
                throw new Error('Game not initialized')
            }
            this._gameCache = game
            return game
        })()
        this._gameInflight = inflight
        try {
            return await inflight
        } finally {
            if (this._gameInflight === inflight) {
                this._gameInflight = undefined
            }
        }
    }

    async getState(reload = false): Promise<GameState> {
        if (!reload && this._stateCache) {
            return this._stateCache
        }
        if (!reload && this._stateInflight) {
            return this._stateInflight
        }
        const inflight = (async () => {
            const state = await this.server.table('state').get()
            if (!state) {
                throw new Error('Game state not initialized')
            }
            this._stateCache = GameState.from(state, this._gameCache)
            return this._stateCache
        })()
        this._stateInflight = inflight
        try {
            return await inflight
        } finally {
            if (this._stateInflight === inflight) {
                this._stateInflight = undefined
            }
        }
    }

    get cachedGame(): PlatformContract.Types.game_row | undefined {
        return this._gameCache
    }

    get cachedState(): GameState | undefined {
        return this._stateCache
    }
}
