import type {Checksum256Type} from '@wharfkit/antelope'
import {Checksum256} from '@wharfkit/antelope'
import {type CoordinateAddress, encodeAddress} from './address'

const cache = new Map<string, CoordinateAddress>()
const CACHE_MAX = 4096

export function encodeAddressMemo(seed: Checksum256Type, x: number, y: number): CoordinateAddress {
    const key = `${Checksum256.from(seed).toString()}:${x},${y}`
    let hit = cache.get(key)
    if (!hit) {
        hit = encodeAddress(seed, x, y)
        if (cache.size >= CACHE_MAX) {
            const oldest = cache.keys().next().value
            if (oldest !== undefined) cache.delete(oldest)
        }
        cache.set(key, hit)
    }
    return hit
}
