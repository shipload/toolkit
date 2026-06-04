import {BlockTimestamp, type UInt16Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import type {CoordinatesType, Distance} from '../types'
import {hasSystem} from '../utils/system'
import {findNearbyPlanets} from '../travel/travel'
import type {ServerContract} from '../contracts'
import {type DerivedStratum, deriveStrata, getEffectiveReserve} from '../derivation'

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

    async getStrata(
        coords: CoordinatesType,
        now: BlockTimestamp = BlockTimestamp.fromMilliseconds(Date.now())
    ): Promise<LocationStratum[]> {
        const game = await this.getGame()
        const state = await this.getState()

        const derived = deriveStrata(coords, game.config.seed, state.epochSeed)
        if (derived.length === 0) return []

        const overrides = (await this.server.readonly('getreserves', {
            x: coords.x,
            y: coords.y,
        })) as ServerContract.Types.stratum_remaining[]

        const epochSeconds = Number(game.config.epochtime)
        const overrideMap = new Map<number, ServerContract.Types.stratum_remaining>()
        for (const o of overrides) {
            overrideMap.set(Number(o.stratum), o)
        }

        return derived.map((s) => {
            const override = overrideMap.get(s.index)
            const reserve = override
                ? getEffectiveReserve(
                      {
                          remaining: override.remaining,
                          max_reserve: s.reserve,
                          last_block: override.last_block,
                      },
                      now,
                      epochSeconds
                  )
                : s.reserve
            return {...s, reserveMax: s.reserve, reserve}
        })
    }
}
