import {UInt16Type, UInt64, UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {CoordinatesType, coordsToLocationId, Distance} from '../types'
import {hasSystem} from '../utils/system'
import {findNearbyPlanets} from '../travel/travel'
import {ServerContract} from '../contracts'

export class LocationsManager extends BaseManager {
    async hasSystem(location: CoordinatesType): Promise<boolean> {
        const game = await this.getGame()
        return hasSystem(game.config.seed, location)
    }

    async findNearbyPlanets(
        origin: CoordinatesType,
        maxDistance: UInt16Type = 20
    ): Promise<Distance[]> {
        const game = await this.getGame()
        return findNearbyPlanets(game.config.seed, origin, maxDistance)
    }

    async getLocationEntity(
        id: UInt64Type
    ): Promise<ServerContract.Types.location_row | undefined> {
        const row = await this.server.table('location').get(UInt64.from(id))
        return row ?? undefined
    }

    async getLocationEntityAt(
        coords: CoordinatesType
    ): Promise<ServerContract.Types.location_row | undefined> {
        const id = coordsToLocationId(coords)
        return this.getLocationEntity(id)
    }

    async getAllLocationEntities(): Promise<ServerContract.Types.location_row[]> {
        return this.server.table('location').all()
    }
}
