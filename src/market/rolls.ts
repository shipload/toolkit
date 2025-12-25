import {Checksum256Type} from '@wharfkit/antelope'
import {hash512} from '../utils/hash'

export function roll(gameSeed: Checksum256Type, rollSeed: string): number {
    const hash = hash512(gameSeed, rollSeed)
    // Combine the first two bytes to form a uint16_t value
    return (hash.array[0] << 8) | hash.array[1]
}
