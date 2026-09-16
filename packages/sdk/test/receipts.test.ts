import {describe, expect, test} from 'bun:test'
import {Serializer} from '@wharfkit/antelope'
import {
    decodeWindowReceipt,
    ServerTypes,
    windowReceiptCompletesAtMs,
    windowReceiptStartsAtMs,
} from '../src'

describe('decodeWindowReceipt', () => {
    test('reads the JSON return value of a craftjob or buildjob action', () => {
        const receipt = decodeWindowReceipt({
            job_id: '7',
            starts_at: '2026-09-13T12:00:00.000',
            completes_at: '2026-09-13T12:30:00.000',
        })
        expect(Number(receipt.job_id)).toBe(7)
        expect(windowReceiptStartsAtMs(receipt)).toBe(Date.UTC(2026, 8, 13, 12, 0, 0))
        expect(windowReceiptCompletesAtMs(receipt)).toBe(Date.UTC(2026, 8, 13, 12, 30, 0))
    })

    test('reads the packed return value bytes', () => {
        const packed = Serializer.encode({
            object: ServerTypes.window_receipt.from({
                job_id: '9',
                starts_at: '2026-09-13T12:00:00.000',
                completes_at: '2026-09-13T12:01:00.000',
            }),
        })
        const receipt = decodeWindowReceipt(packed.array)
        expect(Number(receipt.job_id)).toBe(9)
        expect(windowReceiptCompletesAtMs(receipt) - windowReceiptStartsAtMs(receipt)).toBe(60_000)
    })

    test('rejects a missing return value', () => {
        expect(() => decodeWindowReceipt(null)).toThrow(/no return value/)
    })
})
