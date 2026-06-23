export interface ReachStats {
    generator?: {capacity: bigint}
    engines?: {drain: bigint}
    hauler?: {drain: bigint}
}

export function computePerLegReach(s: ReachStats, haulCount = 0): number {
    const capacity = s.generator?.capacity
    const drain = s.engines?.drain
    if (capacity === undefined || drain === undefined || drain === 0n) {
        throw new Error('entity has no usable engine/generator (cannot compute per-leg reach)')
    }
    const haulDrain = s.hauler && haulCount > 0 ? s.hauler.drain * BigInt(haulCount) : 0n
    return Number(capacity) / Number(drain + haulDrain)
}

export function computeGroupPerLegReach(participants: ReachStats[], haulCount: number): number {
    const movers = participants.filter((p) => p.engines !== undefined && p.engines.drain !== 0n)
    if (movers.length === 0) {
        throw new Error('group has no moving entity (cannot compute per-leg reach)')
    }
    return Math.min(...movers.map((p) => computePerLegReach(p, haulCount)))
}
