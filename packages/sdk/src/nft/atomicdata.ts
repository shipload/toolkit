export interface SchemaField {
    name: string
    type: string
}

export type RawData =
    | Uint8Array
    | string
    | number[]
    | {immutable_serialized_data: Uint8Array | string | number[]}

export function deserializeAtomicData(
    data: RawData,
    schema: SchemaField[]
): Record<string, unknown> {
    let rawData: Uint8Array | string | number[]
    if (data && typeof data === 'object' && 'immutable_serialized_data' in (data as object)) {
        rawData = (data as {immutable_serialized_data: Uint8Array | string | number[]})
            .immutable_serialized_data
    } else {
        rawData = data as Uint8Array | string | number[]
    }

    let bytes: Uint8Array
    if (typeof rawData === 'string') {
        const hex = rawData
        bytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
        }
    } else if (Array.isArray(rawData)) {
        bytes = new Uint8Array(rawData)
    } else {
        bytes = rawData
    }

    let offset = 0

    function readVarint(): number {
        let result = 0
        let multiplier = 1
        while (bytes[offset] >= 128) {
            result += (bytes[offset] - 128) * multiplier
            offset++
            multiplier *= 128
        }
        result += bytes[offset] * multiplier
        offset++
        return result
    }

    function readVarint64(): bigint {
        let result = 0n
        let multiplier = 1n
        while (bytes[offset] >= 128) {
            result += BigInt(bytes[offset] - 128) * multiplier
            offset++
            multiplier *= 128n
        }
        result += BigInt(bytes[offset]) * multiplier
        offset++
        return result
    }

    function readZigzagInt64(): bigint {
        const unsigned = readVarint64()
        if (unsigned % 2n === 0n) {
            return unsigned / 2n
        } else {
            return -(unsigned / 2n) - 1n
        }
    }

    function readString(): string {
        const length = readVarint()
        const str = new TextDecoder().decode(bytes.slice(offset, offset + length))
        offset += length
        return str
    }

    const RESERVED = 4
    const result: Record<string, unknown> = {}

    while (offset < bytes.length) {
        const fieldIndex = readVarint() - RESERVED
        const field = schema[fieldIndex]
        if (!field) break

        switch (field.type) {
            case 'uint16':
                result[field.name] = readVarint()
                break
            case 'uint32':
                result[field.name] = readVarint()
                break
            case 'uint64':
                result[field.name] = readVarint64()
                break
            case 'int32':
                result[field.name] = readZigzagInt64()
                break
            case 'int64':
                result[field.name] = readZigzagInt64()
                break
            case 'string':
            case 'image':
            case 'ipfs':
                result[field.name] = readString()
                break
            case 'uint16[]': {
                const len = readVarint()
                const arr: number[] = []
                for (let i = 0; i < len; i++) arr.push(readVarint())
                result[field.name] = arr
                break
            }
            case 'uint64[]': {
                const len = readVarint()
                const arr: bigint[] = []
                for (let i = 0; i < len; i++) arr.push(readVarint64())
                result[field.name] = arr
                break
            }
            default:
                throw new Error(`Unknown type: ${field.type}`)
        }
    }

    return result
}
