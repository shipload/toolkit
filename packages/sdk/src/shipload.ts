import {APIClient} from '@wharfkit/antelope'
import {FundContract, PlatformContract, ServerContract} from './contracts'
import type {ChainDefinition} from '@wharfkit/common'
import {ContractKit, type Contract} from '@wharfkit/contract'

import {GameContext} from './managers/context'
import type {EntitiesManager} from './managers/entities'
import type {PlayersManager} from './managers/players'
import type {LocationsManager} from './managers/locations'
import type {CoordinatesManager} from './managers/coordinates'
import type {EpochsManager} from './managers/epochs'
import type {ActionsManager} from './managers/actions'
import type {ClusterManager} from './managers/cluster'
import type {NftManager} from './managers/nft'
import type {BalancesManager} from './managers/balances'
import type {FundManager} from './managers/fund'
import type {JobsManager} from './managers/jobs'
import type {ShuttleManager} from './managers/shuttle'
import type {InfluenceManager} from './managers/influence'
import type {SubscriptionsManager} from './subscriptions/manager'
import type {GameState} from './entities/gamestate'

interface ShiploadOptions {
    platformContractName?: string
    serverContractName?: string
    fundContractName?: string
    platformContractAccount?: string
    serverContractAccount?: string
    fundContractAccount?: string
    client?: APIClient
    subscriptionsUrl?: string
    atomicAssetsAccount?: string
}

interface ShiploadConstructorOptions extends ShiploadOptions {
    platformContract?: Contract
    serverContract?: Contract
    fundContract?: Contract
}

export class Shipload {
    private readonly _context: GameContext

    constructor(chain: ChainDefinition, constructorOptions?: ShiploadConstructorOptions) {
        const {client, platformContract, serverContract, fundContract} = constructorOptions || {}
        const apiClient = client || new APIClient({url: chain.url})

        const platform = platformContract
            ? platformContract
            : new PlatformContract.Contract({
                  client: apiClient,
                  account: constructorOptions?.platformContractAccount,
              })

        const server = serverContract
            ? serverContract
            : new ServerContract.Contract({
                  client: apiClient,
                  account: constructorOptions?.serverContractAccount,
              })

        const fund = fundContract
            ? fundContract
            : new FundContract.Contract({
                  client: apiClient,
                  account: constructorOptions?.fundContractAccount,
              })

        this._context = new GameContext(
            apiClient,
            server,
            platform,
            constructorOptions?.atomicAssetsAccount ?? 'atomicassets',
            fund
        )

        if (constructorOptions?.subscriptionsUrl) {
            this._context.setSubscriptionsUrl(constructorOptions.subscriptionsUrl)
        }
    }

    static async load(
        chain: ChainDefinition,
        shiploadOptions?: ShiploadOptions
    ): Promise<Shipload> {
        let platform: Contract = new PlatformContract.Contract({
            client: new APIClient({url: chain.url}),
        })
        if (shiploadOptions?.platformContractName) {
            const client = shiploadOptions.client || new APIClient({url: chain.url})
            const contractKit = new ContractKit({client})
            platform = await contractKit.load(shiploadOptions.platformContractName)
        }

        let server: Contract = new ServerContract.Contract({
            client: new APIClient({url: chain.url}),
        })
        if (shiploadOptions?.serverContractName) {
            const client = shiploadOptions.client || new APIClient({url: chain.url})
            const contractKit = new ContractKit({client})
            server = await contractKit.load(shiploadOptions.serverContractName)
        }

        let fund: Contract = new FundContract.Contract({
            client: new APIClient({url: chain.url}),
        })
        if (shiploadOptions?.fundContractName) {
            const client = shiploadOptions.client || new APIClient({url: chain.url})
            const contractKit = new ContractKit({client})
            fund = await contractKit.load(shiploadOptions.fundContractName)
        }

        return new Shipload(chain, {
            ...shiploadOptions,
            platformContract: platform,
            serverContract: server,
            fundContract: fund,
        })
    }

    get client(): APIClient {
        return this._context.client
    }

    get atomicAssetsAccount(): string {
        return this._context.atomicAssetsAccount
    }

    get server(): Contract {
        return this._context.server
    }

    get platform(): Contract {
        return this._context.platform
    }

    get fund(): Contract {
        return this._context.fund
    }

    get entities(): EntitiesManager {
        return this._context.entities
    }

    get players(): PlayersManager {
        return this._context.players
    }

    get locations(): LocationsManager {
        return this._context.locations
    }

    get coordinates(): CoordinatesManager {
        return this._context.coordinates
    }

    get epochs(): EpochsManager {
        return this._context.epochs
    }

    get actions(): ActionsManager {
        return this._context.actions
    }

    get clusters(): ClusterManager {
        return this._context.clusters
    }

    get nft(): NftManager {
        return this._context.nft
    }

    get funds(): FundManager {
        return this._context.funds
    }

    get balances(): BalancesManager {
        return this._context.balances
    }

    get jobs(): JobsManager {
        return this._context.jobs
    }

    get shuttle(): ShuttleManager {
        return this._context.shuttle
    }

    get influence(): InfluenceManager {
        return this._context.influence
    }

    get subscriptions(): SubscriptionsManager {
        return this._context.subscriptions
    }

    async getGame(reload = false): Promise<PlatformContract.Types.game_row> {
        return this._context.getGame(reload)
    }

    async getState(reload = false): Promise<GameState> {
        return this._context.getState(reload)
    }
}
