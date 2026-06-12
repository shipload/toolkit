import Table from 'cli-table3'
import type {Coord} from './route-planner'

const BORDERLESS: Table.TableConstructorOptions = {
    chars: {
        top: '', 'top-mid': '', 'top-left': '', 'top-right': '',
        bottom: '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
        left: '  ', 'left-mid': '', mid: '', 'mid-mid': '',
        right: '', 'right-mid': '', middle: '  ',
    },
    style: {head: [], border: [], 'padding-left': 0, 'padding-right': 0},
}

function trimTable(table: {toString(): string}): string {
    return table
        .toString()
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n')
}

const coordStr = (c: Coord): string => `(${c.x}, ${c.y})`

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m < 60) return s === 0 ? `${m}m` : `${m}m ${s}s`
    const h = Math.floor(m / 60)
    const rem = m % 60
    return rem === 0 ? `${h}h` : `${h}h ${rem}m`
}

const legDuration = (seconds: number): string =>
    seconds > 0 ? formatDuration(Math.round(seconds)) : '—'

export interface ReachStats {
    generator?: {capacity: bigint}
    engines?: {drain: bigint}
}

export function computePerLegReach(s: ReachStats): number {
    const capacity = s.generator?.capacity
    const drain = s.engines?.drain
    if (capacity === undefined || drain === undefined || drain === 0n) {
        throw new Error('entity has no usable engine/generator (cannot compute per-leg reach)')
    }
    return Number(capacity) / Number(drain)
}

export function buildHypotheticalSnapshot<T extends {coordinates: {x: bigint; y: bigint}; energy?: bigint; generator?: {capacity: bigint}}>(
    base: T,
    at: Coord,
    energy?: bigint,
): T {
    const startEnergy = energy ?? base.generator?.capacity ?? base.energy
    return {
        ...base,
        coordinates: {x: BigInt(at.x), y: BigInt(at.y)},
        energy: startEnergy,
        is_idle: true,
        lanes: [],
    }
}

export interface LegEstimate {
    index: number
    from: Coord
    to: Coord
    distance: number
    energyUsed: number
    energyCap: number
    travelSeconds: number
    rechargeSeconds: number
}

export interface RouteMeta {
    label: string
    origin: Coord
    dest: Coord
    legs: number
    totalDistance: number
    group: boolean
    approxPricing: boolean
}

export interface RouteTotals {
    flightSeconds: number
    rechargeSeconds: number
    totalSeconds: number
}

export function routeTotals(legs: LegEstimate[]): RouteTotals {
    const flightSeconds = legs.reduce((sum, l) => sum + l.travelSeconds, 0)
    const rechargeSeconds = legs.reduce((sum, l) => sum + l.rechargeSeconds, 0)
    return {flightSeconds, rechargeSeconds, totalSeconds: flightSeconds + rechargeSeconds}
}

export function renderRoutePlan(meta: RouteMeta, legs: LegEstimate[], commands: string[]): string {
    const header = `Route: ${meta.label}   ${coordStr(meta.origin)} → ${coordStr(meta.dest)}`

    const table = new Table({
        head: ['Leg', 'From', 'To', 'Dist', 'Energy', 'Flight', 'Recharge'],
        ...BORDERLESS,
    })

    for (const leg of legs) {
        const energy = meta.approxPricing
            ? '~'
            : `${Math.round(leg.energyUsed)}/${leg.energyCap}`
        table.push([
            String(leg.index),
            coordStr(leg.from),
            coordStr(leg.to),
            leg.distance.toFixed(1),
            energy,
            legDuration(leg.travelSeconds),
            legDuration(leg.rechargeSeconds),
        ])
    }

    const totals = routeTotals(legs)
    const summary = new Table(BORDERLESS)
    summary.push(
        ['Legs:', String(meta.legs)],
        ['Distance:', `${meta.totalDistance.toFixed(1)} tiles`],
        ['Flight:', formatDuration(Math.round(totals.flightSeconds))],
        ['Recharge:', formatDuration(Math.round(totals.rechargeSeconds))],
        ['Total:', formatDuration(Math.round(totals.totalSeconds))],
    )

    const parts = [header, '', trimTable(table), '', trimTable(summary), '', 'Commands:', ...commands.map((c) => `  ${c}`)]
    if (meta.approxPricing) {
        parts.push('', 'Note: group energy/time are lead-ship approximations; combined mass validated on leg 1.')
    }
    return parts.join('\n')
}

export function routePlanToJson(meta: RouteMeta, legs: LegEstimate[]) {
    return {
        entity: meta.label,
        origin: meta.origin,
        dest: meta.dest,
        legs: legs.map((l) => ({
            index: l.index,
            from: l.from,
            to: l.to,
            distance: l.distance,
            energyUsed: meta.approxPricing ? null : l.energyUsed,
            energyCap: l.energyCap,
            travelSeconds: l.travelSeconds,
            rechargeSeconds: l.rechargeSeconds,
        })),
        legCount: meta.legs,
        totalDistance: meta.totalDistance,
        ...routeTotals(legs),
        approxPricing: meta.approxPricing,
    }
}
