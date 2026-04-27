import {UInt16Type, UInt64, UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {CoordinatesType, coordsToLocationId, Distance} from '../types'
import {hasSystem} from '../utils/system'
import {findNearbyPlanets} from '../travel/travel'
import {ServerContract} from '../contracts'
import {DerivedStratum, deriveStrata} from '../derivation'

export interface LocationStratum extends DerivedStratum {
    reserveMax: number
}

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

    async getStrata(coords: CoordinatesType): Promise<LocationStratum[]> {
        const game = await this.getGame()
        const state = await this.getState()

        const derived = deriveStrata(coords, game.config.seed, state.epochSeed)
        if (derived.length === 0) return []

        const overrides = (await this.server.readonly('getreserves', {
            x: coords.x,
            y: coords.y,
        })) as ServerContract.Types.stratum_remaining[]

        const overrideMap = new Map<number, number>()
        for (const o of overrides) {
            overrideMap.set(Number(o.stratum), Number(o.remaining))
        }

        return derived.map((s) => ({
            ...s,
            reserveMax: s.reserve,
            reserve: overrideMap.get(s.index) ?? s.reserve,
        }))
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
