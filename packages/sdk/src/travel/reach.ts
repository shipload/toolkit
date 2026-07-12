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

export function computeGroupPerLegReach(participants: ReachStats[]): number {
    const movers = participants.filter((p) => p.engines !== undefined && p.engines.drain !== 0n)
    if (movers.length === 0) {
        throw new Error('group has no moving entity (cannot compute per-leg reach)')
    }
    return Math.min(...movers.map(computePerLegReach))
}
