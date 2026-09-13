import {describe, expect, test} from 'bun:test'
import {Serializer} from '@wharfkit/antelope'
import {
    bookingReceiptLandsAtMs,
    bookingReceiptRuntimeSeconds,
    decodeBookingReceipt,
    ServerTypes,
} from '../src'

const LANDS_AT = '2026-09-13T12:00:00.000'

describe('decodeBookingReceipt', () => {
    test('reads the JSON return value of a craftjob action', () => {
        const receipt = decodeBookingReceipt({job_id: '7', lands_at: LANDS_AT, runtime: 1800})
        expect(Number(receipt.job_id)).toBe(7)
        expect(bookingReceiptLandsAtMs(receipt)).toBe(Date.UTC(2026, 8, 13, 12, 0, 0))
        expect(bookingReceiptRuntimeSeconds(receipt)).toBe(1800)
    })

    test('reads the packed return value bytes', () => {
        const packed = Serializer.encode({
            object: ServerTypes.booking_receipt.from({
                job_id: '9',
                lands_at: LANDS_AT,
                runtime: 60,
            }),
        })
        const receipt = decodeBookingReceipt(packed.array)
        expect(Number(receipt.job_id)).toBe(9)
        expect(bookingReceiptRuntimeSeconds(receipt)).toBe(60)
    })

    test('rejects a missing return value', () => {
        expect(() => decodeBookingReceipt(null)).toThrow(/no return value/)
        expect(() => decodeBookingReceipt(undefined)).toThrow(/no return value/)
    })
})
