import type {BlockTimestamp, UInt32} from '@wharfkit/antelope'

export interface EffectiveReserveInput {
    remaining: UInt32 | number
    max_reserve: UInt32 | number
    last_block: BlockTimestamp
}

function toNumber(value: UInt32 | number): number {
    return typeof value === 'number' ? value : Number(value)
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
    const nowSlot = BigInt(now.value.toString())
    const lastSlot = BigInt(row.last_block.value.toString())
    if (nowSlot <= lastSlot) return remaining
    const max64 = BigInt(max)
    const slots64 = BigInt(epochSlots)
    const regen = Number((max64 * nowSlot) / slots64 - (max64 * lastSlot) / slots64)
    const effective = remaining + regen
    return effective >= max ? max : effective
}
