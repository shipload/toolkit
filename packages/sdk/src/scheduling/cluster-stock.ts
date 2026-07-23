import {type AvailabilityInput, projectedCargoAvailableAt} from './availability'

// Union of every cluster member's present available cargo (present-only; incoming/future not credited).
export function clusterStockAvailable(
    members: readonly AvailabilityInput[],
    at: Date
): Map<string, bigint> {
    const total = new Map<string, bigint>()
    for (const member of members) {
        for (const [key, qty] of projectedCargoAvailableAt(member, at)) {
            total.set(key, (total.get(key) ?? 0n) + qty)
        }
    }
    return total
}
