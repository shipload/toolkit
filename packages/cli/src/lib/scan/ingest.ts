import {getItem, LocationType} from '@shipload/sdk'
import type {DerivedCell} from '@shipload/sdk/scan'
import type {Histogram} from './histogram'
import type {MultiHigh} from './multi-high'
import type {TopN} from './top-n'
import type {LeaderboardEntry, StatTriple} from './types'

export interface ScanAccumulators {
    histogram: Histogram
    multiHigh: MultiHigh
    leaderboard: TopN
    locationCounts: {planets: number; asteroids: number; nebulas: number; iceFields: number}
}

export function resolveItemName(itemId: number): string {
    try {
        return getItem(itemId).name
    } catch {
        return `#${itemId}`
    }
}

export function ingestDerivedCells(
    cells: DerivedCell[],
    acc: ScanAccumulators,
    getItemName: (itemId: number) => string = resolveItemName
): {locations: number; strata: number} {
    let locations = 0
    let strata = 0

    for (const cell of cells) {
        const locType = cell.location.locType as LocationType
        if (locType === LocationType.EMPTY) continue

        switch (locType) {
            case LocationType.PLANET:
                acc.locationCounts.planets++
                break
            case LocationType.ASTEROID:
                acc.locationCounts.asteroids++
                break
            case LocationType.NEBULA:
                acc.locationCounts.nebulas++
                break
            case LocationType.ICE_FIELD:
                acc.locationCounts.iceFields++
                break
        }
        locations++

        const subtype = cell.location.subtype
        for (const dep of cell.deposits) {
            const stats: StatTriple = {
                stat1: dep.stats[0],
                stat2: dep.stats[1],
                stat3: dep.stats[2],
            }
            strata++
            acc.histogram.ingest(stats)
            acc.multiHigh.ingest(stats)
            const entry: LeaderboardEntry = {
                coord: {x: cell.location.x, y: cell.location.y},
                locType,
                subtype,
                itemId: dep.itemId,
                itemName: getItemName(dep.itemId),
                stratum: dep.depth,
                richness: dep.richness,
                reserve: dep.reserve,
                stats,
            }
            acc.leaderboard.ingest(entry)
        }
    }

    return {locations, strata}
}
