import {expect, test} from 'bun:test'
import {ServerTypes} from '@shipload/sdk'
import {formatWindowReceipt} from '../../src/lib/format'

test('formatWindowReceipt states the start and finish as commitments', () => {
    const receipt = ServerTypes.window_receipt.from({
        job_id: 7,
        starts_at: '2026-09-15T14:20:00.000',
        completes_at: '2026-09-15T16:05:00.000',
    })
    const now = new Date('2026-09-15T12:10:00Z')
    expect(formatWindowReceipt(receipt, now)).toBe(
        'Booked. Starts 14:20:00 UTC (in 2h 10m), done 16:05:00 UTC.'
    )
})

test('formatWindowReceipt reads a window that starts now', () => {
    const receipt = ServerTypes.window_receipt.from({
        job_id: 7,
        starts_at: '2026-09-15T14:20:00.000',
        completes_at: '2026-09-15T14:50:00.000',
    })
    const now = new Date('2026-09-15T14:20:00Z')
    expect(formatWindowReceipt(receipt, now)).toBe(
        'Booked. Starts 14:20:00 UTC (now), done 14:50:00 UTC.'
    )
})
