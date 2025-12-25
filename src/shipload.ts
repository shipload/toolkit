import {APIClient} from '@wharfkit/antelope'
import {PlatformContract, ServerContract} from './contracts'
import {ChainDefinition} from '@wharfkit/session'
import ContractKit, {Contract} from '@wharfkit/contract'

import {GameContext} from './managers/context'
import {EntitiesManager} from './managers/entities'
import {PlayersManager} from './managers/players'
import {LocationsManager} from './managers/locations'
import {TradesManager} from './managers/trades'
import {EpochsManager} from './managers/epochs'
import {ActionsManager} from './managers/actions'
import {GameState} from './entities/gamestate'

interface ShiploadOptions {
    platformContractName?: string
    serverContractName?: string
    client?: APIClient
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

    get trades(): TradesManager {
        return this._context.trades
    }

    get epochs(): EpochsManager {
        return this._context.epochs
    }

    get actions(): ActionsManager {
        return this._context.actions
    }

    async getGame(reload = false): Promise<PlatformContract.Types.game_row> {
        return this._context.getGame(reload)
    }

    async getState(reload = false): Promise<GameState> {
        return this._context.getState(reload)
    }
}
