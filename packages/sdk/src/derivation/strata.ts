import type {Checksum256Type} from '@wharfkit/antelope'
import type {CoordinatesType} from '../types'
import {deriveLocationStatic} from '../utils/system'
import {deriveLocationSize} from './location-size'
import {deriveResourceStats, deriveStratum, type ResourceStats} from './stratum'

export interface DerivedStratum {
    index: number
    itemId: number
    seed: bigint
    richness: number
    reserve: number
    stats: ResourceStats
}

export function deriveStrata(
    coords: CoordinatesType,
    gameSeed: Checksum256Type,
    epochSeed: Checksum256Type
): DerivedStratum[] {
    const loc = deriveLocationStatic(gameSeed, coords)
    const locType = Number(loc.type)
    if (locType === 0) return []

    const size = deriveLocationSize(loc)
    if (size === 0) return []

    const subtype = Number(loc.subtype)
    const out: DerivedStratum[] = []
    for (let i = 0; i < size; i++) {
        const s = deriveStratum(epochSeed, coords, i, locType, subtype, size)
        if (s.reserve === 0) continue
        out.push({
            index: i,
            itemId: s.itemId,
            seed: s.seed,
            richness: s.richness,
            reserve: s.reserve,
            stats: s.seed ? deriveResourceStats(s.seed) : {stat1: 0, stat2: 0, stat3: 0},
        })
    }
    return out
}
