import {expect, test} from 'bun:test'
import {responsibleEpoch} from './admission'

test('a handle registered before the target epoch row exists is responsible for the target', () => {
    expect(responsibleEpoch({handle: 'mycoolnode', target: 413})).toBe(413)
})

test('a handle inside the snapshotted oracle set is responsible for the target', () => {
    expect(
        responsibleEpoch({
            handle: 'mycoolnode',
            target: 413,
            epochOracleIds: ['beacon', 'mycoolnode'],
        })
    ).toBe(413)
})

test('a handle missing from the snapshotted oracle set waits one epoch', () => {
    expect(responsibleEpoch({handle: 'mycoolnode', target: 413, epochOracleIds: ['beacon']})).toBe(
        414
    )
})
