import {expect, test} from 'bun:test'
import {parseAuth, parseAuthList} from '../../../src/lib/msig/auth'

test('parseAuth defaults permission to active', () => {
    const lvl = parseAuth('eon.shipload')
    expect(lvl.actor.toString()).toBe('eon.shipload')
    expect(lvl.permission.toString()).toBe('active')
})

test('parseAuth honours explicit permission', () => {
    const lvl = parseAuth('eon.shipload@owner')
    expect(lvl.actor.toString()).toBe('eon.shipload')
    expect(lvl.permission.toString()).toBe('owner')
})

test('parseAuthList splits and parses comma-separated authorities', () => {
    const list = parseAuthList('alice@active,bob,carol@owner')
    expect(list.map((l) => l.toString())).toEqual([
        'alice@active',
        'bob@active',
        'carol@owner',
    ])
})
