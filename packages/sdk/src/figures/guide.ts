import {UInt16, UInt32} from '@wharfkit/antelope'
import {calc_gather_duration, calc_gather_energy, calc_gather_rate} from '../capabilities/gathering'
import type {ModuleCapabilityKind} from '../derivation/capabilities'
import {decodeStats, encodeStats, getItemStatKeys} from '../derivation/crafting'
import {getStatDefinitions} from '../derivation/stats'
import {CATEGORY_LABELS, MASS_UNITS_PER_TONNE, PRECISION, type ResourceCategory} from '../types'
import type {GathererStats} from '../types/capabilities'
import {getModuleFigures} from './module'
import {milliToEnergy, referenceYieldPerMinute} from './reference'
import type {Figure} from './types'

export const STAT_LOW = 1
export const STAT_HIGH = 999

const FIGURE_SOURCE_STATS: Record<ModuleCapabilityKind, Record<string, string[]>> = {
    engine: {speed: ['volatility'], drain: ['volatility', 'thermal']},
    generator: {capacity: ['resonance'], recharge: ['reflectivity']},
    battery: {capacity: ['volatility', 'thermal', 'plasticity', 'insulation']},
    gatherer: {yield: ['strength'], depth: ['tolerance'], drain: ['saturation']},
    loader: {transfer: ['insulation', 'plasticity'], payload: ['insulation'], shuttles: []},
    storage: {capacity: ['strength', 'density', 'hardness'], drain: ['cohesion']},
    crafter: {speed: ['fineness'], drain: ['conductivity']},
    builder: {speed: ['resonance'], drain: ['fineness']},
    hauler: {tows: ['resonance'], handling: ['plasticity'], drain: ['conductivity']},
    warp: {jump: ['reflectivity']},
    launcher: {charge: [], launchSpeed: [], drain: []},
}

const STAT_LABELS: Record<string, string> = Object.fromEntries(
    (Object.keys(CATEGORY_LABELS) as ResourceCategory[]).flatMap((category) =>
        getStatDefinitions(category).map((d) => [d.key, d.label])
    )
)

export interface FigureStat {
    key: string
    label: string
    index: number
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

export function getModuleFigureSources(itemId: number): FigureSource[] | undefined {
    const figures = getModuleFigures(itemId, 0n)
    if (!figures) return undefined
    const statKeys = getItemStatKeys(itemId)
    const sources = FIGURE_SOURCE_STATS[figures.kind]
    return figures.rows.map((row) => ({
        key: row.key,
        label: row.label,
        stats: (sources[row.key] ?? []).flatMap((key) => {
            const index = statKeys.indexOf(key)
            return index < 0 ? [] : [{key, label: STAT_LABELS[key] ?? key, index}]
        }),
    }))
}

export function sweepModuleFigures(
    itemId: number,
    stats: bigint | {toString(): string}
): FigureSweep[] | undefined {
    const packed = BigInt(String(stats))
    const current = getModuleFigures(itemId, packed)
    const sources = getModuleFigureSources(itemId)
    if (!current || !sources) return undefined
    const values = decodeStats(packed, getItemStatKeys(itemId).length)
    const figureAt = (index: number, value: number, key: string): Figure => {
        const next = [...values]
        next[index] = value
        const row = getModuleFigures(itemId, encodeStats(next))?.rows.find((r) => r.key === key)
        if (!row) throw new Error(`figure ${key} missing for item ${itemId}`)
        return row
    }
    return sources.map((source, i) => ({
        key: source.key,
        label: source.label,
        current: current.rows[i],
        sweeps: source.stats.map((stat) => ({
            stat,
            low: figureAt(stat.index, STAT_LOW, source.key),
            high: figureAt(stat.index, STAT_HIGH, source.key),
        })),
    }))
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
