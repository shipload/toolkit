import {Bytes, Checksum256, Checksum256Type, Checksum512} from '@wharfkit/antelope'

export function hash(seed: Checksum256Type, string: string): Checksum512 {
    const bytes = Bytes.from(`${seed}${string}`, 'utf8')
    return Checksum256.hash(bytes)
}

export function hash512(seed: Checksum256Type, string: string): Checksum512 {
    const bytes = Bytes.from(`${seed}${string}`, 'utf8')
    return Checksum512.hash(bytes)
}
