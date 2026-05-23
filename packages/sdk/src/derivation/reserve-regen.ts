import type {BlockTimestamp, UInt32} from '@wharfkit/antelope'

export interface EffectiveReserveInput {
    remaining: UInt32 | number
    max_reserve: UInt32 | number
    last_block: BlockTimestamp
}

function toNumber(value: UInt32 | number): number {
    return typeof value === 'number' ? value : Number(value)
}

function slotsBetween(now: BlockTimestamp, last: BlockTimestamp): number {
    const nowMs = now.toMilliseconds()
    const lastMs = last.toMilliseconds()
    if (nowMs <= lastMs) return 0
    return Math.floor((nowMs - lastMs) / 500)
}

export function getEffectiveReserve(
    row: EffectiveReserveInput,
    now: BlockTimestamp,
    epochSeconds: number
): number {
    const remaining = toNumber(row.remaining)
    const max = toNumber(row.max_reserve)
    if (remaining >= max) return max
    const epochSlots = epochSeconds * 2
    if (epochSlots === 0) return remaining
    const elapsed = slotsBetween(now, row.last_block)
    const regen = Math.floor((max * elapsed) / epochSlots)
    const effective = remaining + regen
    return effective >= max ? max : effective
}
