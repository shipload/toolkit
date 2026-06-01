import {expect, test} from 'bun:test'
import {parseExpiry, readProposeOptions} from '../../../src/lib/msig/options'

test('parseExpiry understands suffixes and raw seconds', () => {
    expect(parseExpiry(undefined)).toBe(2592000) // default 30d
    expect(parseExpiry('30d')).toBe(2592000)
    expect(parseExpiry('12h')).toBe(43200)
    expect(parseExpiry('45m')).toBe(2700)
    expect(parseExpiry('3600')).toBe(3600)
})

test('parseExpiry rejects nonsense', () => {
    expect(() => parseExpiry('soon')).toThrow()
    expect(() => parseExpiry('0d')).toThrow()
})

test('readProposeOptions returns null without --propose', () => {
    expect(readProposeOptions({})).toBeNull()
})

test('readProposeOptions parses flags', () => {
    const opts = readProposeOptions({
        propose: true,
        as: 'eon.shipload',
        proposalName: 'myproposal',
        requested: 'alice@active,bob',
        yes: true,
    })
    expect(opts).not.toBeNull()
    expect(opts?.as?.toString()).toBe('eon.shipload@active')
    expect(opts?.proposalName).toBe('myproposal')
    expect(opts?.requested?.map((l) => l.toString())).toEqual(['alice@active', 'bob@active'])
    expect(opts?.yes).toBe(true)
})

test('readProposeOptions rejects an invalid proposal name', () => {
    expect(() => readProposeOptions({propose: true, proposalName: 'BAD_NAME'})).toThrow()
})
