import {expect, test} from 'bun:test'
import {gatherDepthHeadline} from './gather'

const ctx = {sourceType: 'ship' as const, sourceId: 7n, stratum: 12}

test('routes the explicit-slot depth error string', () => {
    const headline = gatherDepthHeadline(
        new Error('eosio_assert_message: stratum exceeds gatherer depth'),
        ctx
    )
    expect(headline).toBe('✗ Cannot gather: stratum 12 is out of depth.')
})

test('routes the auto-pick depth error string', () => {
    const headline = gatherDepthHeadline(
        new Error('eosio_assert_message: no gatherer reaches this stratum'),
        ctx
    )
    expect(headline).toBe('✗ Cannot gather: no gatherer reaches stratum 12.')
})

test('returns undefined for an unrelated error message', () => {
    expect(gatherDepthHeadline(new Error('some other failure'), ctx)).toBeUndefined()
})
