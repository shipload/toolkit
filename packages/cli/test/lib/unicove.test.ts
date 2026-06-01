import {expect, test} from 'bun:test'
import {unicoveProposalUrl, unicoveTransactionUrl} from '../../src/lib/unicove'

const JUNGLE4 = '73e4385a2708e6d7048834fbc1079f2fabb17b3c125b146af438971e90716c4d'

test('builds jungle4 transaction url', () => {
    expect(unicoveTransactionUrl(JUNGLE4, 'abc123')).toBe(
        'https://jungle4.unicove.com/en/jungle4/transaction/abc123',
    )
})

test('builds jungle4 proposal url', () => {
    expect(unicoveProposalUrl(JUNGLE4, 'alice', 'myproposal')).toBe(
        'https://jungle4.unicove.com/en/jungle4/msig/alice/myproposal',
    )
})

test('returns null for unknown chain id', () => {
    expect(unicoveTransactionUrl('deadbeef', 'abc')).toBeNull()
    expect(unicoveProposalUrl('deadbeef', 'alice', 'p')).toBeNull()
})
