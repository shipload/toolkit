import {expect, test} from 'bun:test'
import {describeClear} from './reset'

test('describeClear names the stored chain tag, row count, and path', () => {
    const msg = describeClear(['unknown'], 3, '/home/op/.config/shipload/oracle/greymass.sqlite')
    expect(msg).toContain('clears 3 stored secret(s)')
    expect(msg).toContain('unknown')
    expect(msg).toContain('/home/op/.config/shipload/oracle/greymass.sqlite')
})

test('describeClear falls back to "no chain" when the store has no chain tag', () => {
    expect(describeClear([], 0, '/tmp/store.sqlite')).toContain('no chain')
})
