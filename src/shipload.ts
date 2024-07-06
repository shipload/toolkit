import {
    APIClient,
    Name,
    NameType,
    Serializer,
    UInt16Type,
    UInt64,
    UInt64Type,
} from '@wharfkit/antelope'
import {Distance, GoodPrice} from './types'
import {marketprice, marketprices} from './market'
import {PlatformContract, ServerContract} from './contracts'
import {ERROR_SYSTEM_NOT_INITIALIZED} from './errors'
import {ChainDefinition} from '@wharfkit/session'
import ContractKit, {Contract} from '@wharfkit/contract'
import {findNearbyPlanets, hasSystem, travelplan} from './travel'
import {Ship} from './ship'
import {getCurrentEpoch} from './epoch'

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
    public client: APIClient
    public server: Contract
    public platform: Contract

    constructor(chain: ChainDefinition, constructorOptions?: ShiploadConstructorOptions) {
        const {client, platformContract, serverContract} = constructorOptions || {}
        this.client = client || new APIClient({url: chain.url})

        this.platform = platformContract
            ? platformContract
            : new PlatformContract.Contract({client: this.client})

        this.server = serverContract
            ? serverContract
            : new ServerContract.Contract({client: this.client})
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

    async getGame(): Promise<PlatformContract.Types.game_row> {
        const game = await this.platform.table('games').get()
        if (!game) {
            throw new Error(ERROR_SYSTEM_NOT_INITIALIZED)
        }
        return game
    }

    async getState(): Promise<ServerContract.Types.state_row> {
        const state = await this.server.table('state').get()
        if (!state) {
            throw new Error(ERROR_SYSTEM_NOT_INITIALIZED)
        }
        return state
    }

    async getShip(ship_id: UInt64Type): Promise<Ship> {
        const ship = await this.server.table('ship').get(UInt64.from(ship_id))
        if (!ship) {
            throw new Error('No ship found')
        }
        return new Ship(ship)
    }

    async getShips(player: NameType | ServerContract.Types.player_row): Promise<Ship[]> {
        let account: Name
        if (player instanceof ServerContract.Types.player_row) {
            account = player.owner
        } else {
            account = Name.from(player)
        }
        const from = Serializer.decode({
            data:
                Serializer.encode({object: UInt64.from(UInt64.min)}).hexString +
                Serializer.encode({object: Name.from(account)}).hexString,
            type: 'uint128',
        })
        const to = Serializer.decode({
            data:
                Serializer.encode({object: UInt64.from(UInt64.max)}).hexString +
                Serializer.encode({object: Name.from(account)}).hexString,
            type: 'uint128',
        })
        const ships = await this.server
            .table('ship')
            .query({
                key_type: 'i128',
                index_position: 'secondary',
                from,
                to,
            })
            .all()
        return ships.map((ship) => new Ship(ship))
    }

    async marketprice(
        location: ServerContract.ActionParams.Type.coordinates,
        good_id: number
    ): Promise<UInt64> {
        const game = await this.getGame()
        const state = await this.getState()
        return marketprice(location, good_id, game.config.seed, state.seed)
    }

    async marketprices(
        location: ServerContract.ActionParams.Type.coordinates
    ): Promise<GoodPrice[]> {
        const game = await this.getGame()
        const state = await this.getState()
        return marketprices(location, game.config.seed, state.seed)
    }

    async hasSystem(location: ServerContract.ActionParams.Type.coordinates): Promise<boolean> {
        const game = await this.getGame()
        return hasSystem(game.config.seed, location)
    }

    async findNearbyPlanets(
        origin: ServerContract.ActionParams.Type.coordinates,
        maxDistance: UInt16Type = 20
    ): Promise<Distance[]> {
        const game = await this.getGame()
        return findNearbyPlanets(game.config.seed, origin, maxDistance)
    }

    async travelplan(
        ship: ServerContract.Types.ship_row,
        origin: ServerContract.ActionParams.Type.coordinates,
        destination: ServerContract.ActionParams.Type.coordinates,
        recharge = false
    ): Promise<ServerContract.Types.travel_plan> {
        const game = await this.getGame()
        const cargos = await this.server.table('cargo').all({
            from: ship.id,
            to: ship.id,
            index_position: 'secondary',
        })
        return travelplan(game, ship, cargos, origin, destination, recharge)
    }

    async getCargo(
        ship: UInt64Type | ServerContract.Types.ship_row
    ): Promise<ServerContract.Types.cargo_row[]> {
        let shipId: UInt64
        if (ship instanceof ServerContract.Types.ship_row) {
            shipId = UInt64.from(ship.id)
        } else {
            shipId = UInt64.from(ship)
        }

        const cargoItems = await this.server
            .table('cargo')
            .query({
                key_type: 'i64',
                index_position: 'secondary',
                from: shipId,
                to: shipId,
            })
            .all()

        return cargoItems
    }

    async getCurrentEpoch(): Promise<UInt64> {
        const game = await this.getGame()
        return getCurrentEpoch(game)
    }
}
