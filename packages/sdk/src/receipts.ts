import {Serializer} from '@wharfkit/antelope'
import {ServerContract} from './contracts'

export type BookingReceipt = ServerContract.Types.booking_receipt

export function decodeBookingReceipt(data: unknown): BookingReceipt {
    if (data === null || data === undefined) {
        throw new Error('decodeBookingReceipt: no return value')
    }
    if (data instanceof Uint8Array || typeof data === 'string') {
        return Serializer.decode({data, type: ServerContract.Types.booking_receipt})
    }
    return ServerContract.Types.booking_receipt.from(data as ServerContract.Types.booking_receipt)
}

export function bookingReceiptLandsAtMs(receipt: BookingReceipt): number {
    return receipt.lands_at.toMilliseconds()
}

export function bookingReceiptRuntimeSeconds(receipt: BookingReceipt): number {
    return Number(receipt.runtime)
}
