import {UInt16, UInt32} from '@wharfkit/antelope'
import {calc_gather_duration, calc_gather_energy, calc_gather_rate} from '../capabilities/gathering'
import {
    computeStatsFromResources,
    decodeStats,
    encodeStats,
    getItemStatKeys,
    traceResourceStatKeys,
} from '../derivation/crafting'
import {getStatDefinitions} from '../derivation/stats'
import {CATEGORY_LABELS, MASS_UNITS_PER_TONNE, PRECISION, type ResourceCategory} from '../types'
import type {GathererStats} from '../types/capabilities'
import {getModuleFigures} from './module'
import {milliToEnergy, referenceYieldPerMinute} from './reference'
import type {Figure} from './types'

export const STAT_LOW = 1
export const STAT_HIGH = 999
const STAT_MID = 500

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ResourceCategory[]

const STAT_LABELS: Record<string, string> = Object.fromEntries(
    CATEGORIES.flatMap((category) => getStatDefinitions(category).map((d) => [d.key, d.label]))
)

const STAT_CATEGORY: Record<string, ResourceCategory> = Object.fromEntries(
    CATEGORIES.flatMap((category) => getStatDefinitions(category).map((d) => [d.key, category]))
)

export interface FigureStat {
    key: string
    label: string
    category: ResourceCategory
}

export interface FigureSource {
    key: string
    label: string
    stats: FigureStat[]
}

export interface StatSweep {
    stat: FigureStat
    low: Figure
    high: Figure
}

export interface FigureSweep {
    key: string
    label: string
    current: Figure
    sweeps: StatSweep[]
}

const statFiguresByItem = new Map<number, string[][]>()

function moduleStatFigures(itemId: number): string[][] {
    const cached = statFiguresByItem.get(itemId)
    if (cached) return cached
    const count = getItemStatKeys(itemId).length
    const result = Array.from({length: count}, (_, index) => {
        const moved = new Set<string>()
        for (const baseline of [STAT_LOW, STAT_MID, STAT_HIGH]) {
            const at = (value: number) => {
                const values = Array<number>(count).fill(baseline)
                values[index] = value
                return getModuleFigures(itemId, encodeStats(values))?.rows ?? []
            }
            const high = at(STAT_HIGH)
            for (const [i, row] of at(STAT_LOW).entries()) {
                if (row.value !== high[i]?.value) moved.add(row.key)
            }
        }
        return [...moved]
    })
    statFiguresByItem.set(itemId, result)
    return result
}

export function getModuleFigureSources(itemId: number): FigureSource[] | undefined {
    const figures = getModuleFigures(itemId, 0n)
    if (!figures) return undefined
    const slotFigures = moduleStatFigures(itemId)
    return figures.rows.map((row) => {
        const keys = slotFigures.flatMap((moved, index) =>
            moved.includes(row.key) ? traceResourceStatKeys(itemId, index) : []
        )
        return {
            key: row.key,
            label: row.label,
            stats: [...new Set(keys)].map((key) => ({
                key,
                label: STAT_LABELS[key] ?? key,
                category: STAT_CATEGORY[key],
            })),
        }
    })
}

export function resourceBaseline(itemId: number, packed: bigint): Record<string, number> {
    const values = decodeStats(packed, getItemStatKeys(itemId).length)
    const baseline: Record<string, number> = {}
    for (const [index, value] of values.entries()) {
        const keys = traceResourceStatKeys(itemId, index).filter((key) => !(key in baseline))
        if (keys.length === 0) continue
        const slotAt = (x: number) =>
            computeStatsFromResources(itemId, {
                ...baseline,
                ...Object.fromEntries(keys.map((key) => [key, x])),
            })[index]
        let lo = 1
        let hi = 999
        while (lo < hi) {
            const mid = Math.floor((lo + hi) / 2)
            if (slotAt(mid) < value) lo = mid + 1
            else hi = mid
        }
        for (const key of keys) baseline[key] = lo
    }
    return baseline
}

export function sweepModuleFigures(
    itemId: number,
    stats: bigint | {toString(): string},
    resources?: Record<string, number>
): FigureSweep[] | undefined {
    const packed = BigInt(String(stats))
    const current = getModuleFigures(itemId, packed)
    const sources = getModuleFigureSources(itemId)
    if (!current || !sources) return undefined
    const base = {...resourceBaseline(itemId, packed), ...resources}
    const rowsAt = new Map<string, Figure[]>()
    const figureAt = (statKey: string, value: number, figureKey: string): Figure => {
        const id = `${statKey}:${value}`
        let rows = rowsAt.get(id)
        if (!rows) {
            const values = computeStatsFromResources(itemId, {...base, [statKey]: value})
            rows = getModuleFigures(itemId, encodeStats(values))?.rows ?? []
            rowsAt.set(id, rows)
        }
        const row = rows.find((r) => r.key === figureKey)
        if (!row) throw new Error(`figure ${figureKey} missing for item ${itemId}`)
        return row
    }
    return sources.map((source, i) => ({
        key: source.key,
        label: source.label,
        current: current.rows[i],
        sweeps: source.stats.map((stat) => ({
            stat,
            low: figureAt(stat.key, STAT_LOW, source.key),
            high: figureAt(stat.key, STAT_HIGH, source.key),
        })),
    }))
}

export interface FigureRange {
    key: string
    label: string
    min: Figure
    max: Figure
}

export function moduleFigureRanges(itemId: number): FigureRange[] {
    const sources = getModuleFigureSources(itemId)
    if (!sources) return []
    const keys = [...new Set(sources.flatMap((source) => source.stats.map((stat) => stat.key)))]
    const ranges = new Map<string, FigureRange>()
    for (let mask = 0; mask < 2 ** keys.length; mask++) {
        const resources = Object.fromEntries(
            keys.map((key, i) => [key, (mask >> i) & 1 ? STAT_HIGH : STAT_LOW])
        )
        const stats = encodeStats(computeStatsFromResources(itemId, resources))
        for (const row of getModuleFigures(itemId, stats)?.rows ?? []) {
            const range = ranges.get(row.key)
            if (!range) {
                ranges.set(row.key, {key: row.key, label: row.label, min: row, max: row})
                continue
            }
            if (row.value < range.min.value) range.min = row
            if (row.value > range.max.value) range.max = row
        }
    }
    return [...ranges.values()]
}

export interface GatherFigures {
    yieldPerMinute: number
    drainPerMinute: number
}

export interface GatherDeposit {
    stratum: number
    richness: number
    itemMass: number
    quantity: number
}

export interface GatherEstimate {
    durationSeconds: number
    tonnesPerMinute: number
    energy: number
}

const UNLIMITED_DEPTH = 65535
const SECONDS_PER_MINUTE = 60
const MILLI_PER_ENERGY = 1000

export function gathererStatsFromFigures(figures: GatherFigures): GathererStats {
    const yieldPerUnit = referenceYieldPerMinute(1)
    return {
        yield: UInt16.from(Math.max(0, Math.round(figures.yieldPerMinute / yieldPerUnit))),
        drain: UInt32.from(
            Math.max(
                0,
                Math.round(
                    (figures.drainPerMinute * MILLI_PER_ENERGY * PRECISION) / SECONDS_PER_MINUTE
                )
            )
        ),
        depth: UInt16.from(UNLIMITED_DEPTH),
    }
}

export function gatherFromFigures(figures: GatherFigures, deposit: GatherDeposit): GatherEstimate {
    const gatherer = gathererStatsFromFigures(figures)
    const duration = calc_gather_duration(
        gatherer,
        deposit.itemMass,
        deposit.quantity,
        deposit.stratum,
        deposit.richness
    ).toNumber()
    const rate = calc_gather_rate(
        gatherer,
        MASS_UNITS_PER_TONNE,
        deposit.stratum,
        deposit.richness
    ).unitsPerMin
    return {
        durationSeconds: duration,
        tonnesPerMinute: rate,
        energy: milliToEnergy(calc_gather_energy(gatherer, duration).toNumber()),
    }
}
