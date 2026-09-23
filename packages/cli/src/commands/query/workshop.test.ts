import {expect, test} from 'bun:test'
import {Name} from '@wharfkit/antelope'
import {toJobWindow} from './workshop'

const row = (over: Record<string, unknown> = {}) => ({
    id: {toNumber: () => 7},
    socket: {toNumber: () => 0},
    owner: Name.from('eggmaple.gm'),
    starts_at: {toDate: () => new Date('2026-07-26T10:00:00Z')},
    completes_at: {toDate: () => new Date('2026-07-26T11:00:00Z')},
    arrives_at: {toDate: () => new Date('2026-07-26T09:45:00Z')},
    recipe_id: {toNumber: () => 10001},
    quantity: {toNumber: () => 10},
    ship_id: {toNumber: () => 77},
    deposited: false,
    cargo: [{item_id: 101, quantity: 100}],
    ...over,
})

test('toJobWindow reads a booking-time row (inputs only) as its inputs', () => {
    const window = toJobWindow(row({cargo: [{item_id: 101, quantity: 100}]}) as never)
    expect(window.inputs).toEqual([{item_id: 101, quantity: 100}] as never)
})

test('toJobWindow reads a booking-time row whose input is booked as more than one stack', () => {
    const window = toJobWindow(
        row({
            cargo: [
                {item_id: 101, quantity: 60},
                {item_id: 101, quantity: 40},
            ],
        }) as never
    )
    expect(window.inputs).toEqual([
        {item_id: 101, quantity: 60},
        {item_id: 101, quantity: 40},
    ] as never)
})
