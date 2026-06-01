import {expect, test} from 'bun:test'
import {generateRandomName, isValidProposalName} from '../../../src/lib/msig/naming'

test('accepts valid antelope names', () => {
    expect(isValidProposalName('abc')).toBe(true)
    expect(isValidProposalName('myproposal12')).toBe(true)
    expect(isValidProposalName('a.b.c')).toBe(true)
})

test('rejects invalid names', () => {
    expect(isValidProposalName('')).toBe(false)
    expect(isValidProposalName('ABC')).toBe(false) // uppercase
    expect(isValidProposalName('toolongname12')).toBe(false) // 13 chars
    expect(isValidProposalName('has6789')).toBe(false) // 6-9 not allowed
    expect(isValidProposalName('has_underscore')).toBe(false)
})

test('generated names are always valid 12-char antelope names', () => {
    for (let i = 0; i < 50; i++) {
        const name = generateRandomName()
        expect(name.length).toBe(12)
        expect(isValidProposalName(name)).toBe(true)
    }
})
