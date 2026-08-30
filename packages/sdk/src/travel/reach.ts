export interface ReachStats {
    generator?: {capacity: bigint | number}
    engines?: {drain: bigint | number}
    energy?: bigint | number
    hasMovement?: boolean
}

export interface ComputePerLegReachOptions {
    basis?: 'capacity' | 'current'
}

export function computePerLegReach(s: ReachStats, opts: ComputePerLegReachOptions = {}): number {
    const basis = opts.basis ?? 'capacity'
    const energy =
        basis === 'capacity' ? s.generator?.capacity : (s.generator?.capacity ?? s.energy)
    const drain = s.engines?.drain
    if (energy === undefined || drain === undefined || Number(drain) === 0) {
        throw new Error('entity has no usable engine/generator (cannot compute per-leg reach)')
    }
    return Number(energy) / Number(drain)
}

export function computeGroupPerLegReach(
    participants: ReachStats[],
    opts: ComputePerLegReachOptions = {}
): number {
    const movers = participants.filter(
        (p) => (p.hasMovement ?? true) && p.engines !== undefined && Number(p.engines.drain) !== 0
    )
    if (movers.length === 0) {
        return 0
    }
    return Math.min(...movers.map((m) => computePerLegReach(m, opts)))
}
