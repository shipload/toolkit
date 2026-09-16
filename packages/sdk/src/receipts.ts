import {Serializer} from '@wharfkit/antelope'
import {ServerContract} from './contracts'

export type WindowReceipt = ServerContract.Types.window_receipt

export function decodeWindowReceipt(data: unknown): WindowReceipt {
    if (data === null || data === undefined) {
        throw new Error('decodeWindowReceipt: no return value')
    }
    if (data instanceof Uint8Array || typeof data === 'string') {
        return Serializer.decode({data, type: ServerContract.Types.window_receipt})
    }
    return ServerContract.Types.window_receipt.from(data as ServerContract.Types.window_receipt)
}

export function windowReceiptStartsAtMs(receipt: WindowReceipt): number {
    return receipt.starts_at.toMilliseconds()
}

export function windowReceiptCompletesAtMs(receipt: WindowReceipt): number {
    return receipt.completes_at.toMilliseconds()
}
