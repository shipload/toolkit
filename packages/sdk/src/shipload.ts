import {APIClient} from '@wharfkit/antelope'
import {PlatformContract, ServerContract} from './contracts'
import type {ChainDefinition} from '@wharfkit/common'
import ContractKit, {type Contract} from '@wharfkit/contract'

import {GameContext} from './managers/context'
import type {EntitiesManager} from './managers/entities'
import type {PlayersManager} from './managers/players'
import type {LocationsManager} from './managers/locations'
import type {EpochsManager} from './managers/epochs'
import type {ActionsManager} from './managers/actions'
import type {SubscriptionsManager} from './subscriptions/manager'
import type {GameState} from './entities/gamestate'

interface ShiploadOptions {
    platformContractName?: string
    serverContractName?: string
    client?: APIClient
    subscriptionsUrl?: string
}

interface ShiploadConstructorOptions extends ShiploadOptions {
    platformContract?: Contract
    serverContract?: Contract
}

export class Shipload {
    private readonly _context: GameContext

    constructor(chain: ChainDefinition, constructorOptions?: ShiploadConstructorOptions) {
        const {client, platformContract, serverContract} = constructorOptions || {}
        const apiClient = client || new APIClient({url: chain.url})

        const platform = platformContract
            ? platformContract
            : new PlatformContract.Contract({client: apiClient})

        const server = serverContract
            ? serverContract
            : new ServerContract.Contract({client: apiClient})

        this._context = new GameContext(apiClient, server, platform)

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

        return new Shipload(chain, {
            ...shiploadOptions,
            platformContract: platform,
            serverContract: server,
        })
    }

    get client(): APIClient {
        return this._context.client
    }

    get server(): Contract {
        return this._context.server
    }

    get platform(): Contract {
        return this._context.platform
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

    get epochs(): EpochsManager {
        return this._context.epochs
    }

    get actions(): ActionsManager {
        return this._context.actions
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
