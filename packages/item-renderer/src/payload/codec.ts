import {Serializer} from '@wharfkit/antelope'
import {ServerContract} from '@shipload/sdk'
import {InvalidPayloadError} from '../errors.ts'
import {base64UrlToBytes, bytesToBase64Url} from './base64url.ts'

export type CargoItem = InstanceType<typeof ServerContract.Types.cargo_item>
export type CargoItemLike = Parameters<typeof ServerContract.Types.cargo_item.from>[0]

export type NftItemPayload = InstanceType<typeof ServerContract.Types.nft_item_payload>
export type NftItemPayloadLike = Parameters<typeof ServerContract.Types.nft_item_payload.from>[0]

export function encodeCargoItem(input: CargoItemLike): string {
    const item = ServerContract.Types.cargo_item.from(input)
    const bytes = Serializer.encode({object: item}).array
    return bytesToBase64Url(bytes)
}

export function decodeCargoItem(input: string): CargoItem {
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

export function encodeNftPayload(input: NftItemPayloadLike): string {
    const payload = ServerContract.Types.nft_item_payload.from(input)
    const bytes = Serializer.encode({object: payload}).array
    return bytesToBase64Url(bytes)
}

export function decodeNftPayload(input: string): NftItemPayload {
    if (input.length === 0) throw new InvalidPayloadError('empty payload')
    const bytes = base64UrlToBytes(input)
    try {
        return Serializer.decode({
            data: bytes,
            type: ServerContract.Types.nft_item_payload,
        }) as NftItemPayload
    } catch (e) {
        throw new InvalidPayloadError(`nft_item_payload decode failed: ${(e as Error).message}`)
    }
}
