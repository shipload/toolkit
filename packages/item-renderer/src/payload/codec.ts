import {Serializer} from '@wharfkit/antelope'
import {ServerContract} from '@shipload/sdk'
import {InvalidPayloadError} from '../errors.ts'
import {base64UrlToBytes, bytesToBase64Url} from './base64url.ts'

export type CargoItem = InstanceType<typeof ServerContract.Types.cargo_item>
export type CargoItemLike = Parameters<typeof ServerContract.Types.cargo_item.from>[0]

export function encodePayload(input: CargoItemLike): string {
    const item = ServerContract.Types.cargo_item.from(input)
    const bytes = Serializer.encode({object: item}).array
    return bytesToBase64Url(bytes)
}

export function decodePayload(input: string): CargoItem {
    if (input.length === 0) throw new InvalidPayloadError('empty payload')
    const bytes = base64UrlToBytes(input)
    try {
        return Serializer.decode({
            data: bytes,
            type: ServerContract.Types.cargo_item,
        }) as CargoItem
    } catch (e) {
        throw new InvalidPayloadError(`cargo_item decode failed: ${(e as Error).message}`)
    }
}
