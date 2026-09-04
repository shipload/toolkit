import {Bytes, Checksum256, type Checksum256Type, Checksum512} from '@wharfkit/antelope'

type NativeHasher = new (
    algorithm: 'sha256' | 'sha512'
) => {
    update(data: Uint8Array): {digest(): Uint8Array}
}

// antelope hashes through pure-JS hash.js; bun's native hasher is ~30x faster and byte-identical.
const nativeHasher: NativeHasher | undefined = (globalThis as {Bun?: {CryptoHasher?: NativeHasher}})
    .Bun?.CryptoHasher

function digest(algorithm: 'sha256' | 'sha512', bytes: Bytes): Uint8Array | undefined {
    return nativeHasher ? new nativeHasher(algorithm).update(bytes.array).digest() : undefined
}

export function hash(seed: Checksum256Type, string: string): Checksum256 {
    const bytes = Bytes.from(`${seed}${string}`, 'utf8')
    const native = digest('sha256', bytes)
    return native ? new Checksum256(native) : Checksum256.hash(bytes)
}

export function hash512(seed: Checksum256Type, string: string): Checksum512 {
    const bytes = Bytes.from(`${seed}${string}`, 'utf8')
    const native = digest('sha512', bytes)
    return native ? new Checksum512(native) : Checksum512.hash(bytes)
}

export function uint16(hash: Checksum512, offset: number): number {
    return (hash.array[offset] << 8) | hash.array[offset + 1]
}
