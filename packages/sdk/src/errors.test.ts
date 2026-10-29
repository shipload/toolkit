import {expect, test} from 'bun:test'
import {CIVIC_BAYS_UNSETTLED, isBaysUnsettled} from './errors'

test('isBaysUnsettled matches the chain assertion a capped Depot settlement refuses with', () => {
    const chain = new Error(`assertion failure with message: ${CIVIC_BAYS_UNSETTLED}`)
    expect(isBaysUnsettled(chain)).toBe(true)
    expect(isBaysUnsettled(new Error('No completed tasks to resolve.'))).toBe(false)
    expect(isBaysUnsettled(CIVIC_BAYS_UNSETTLED)).toBe(false)
})
