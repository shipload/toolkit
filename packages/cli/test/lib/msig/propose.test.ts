import {expect, test} from 'bun:test'
import {Action, Name, PermissionLevel, Transaction} from '@wharfkit/antelope'
import {applyAuthorization, buildProposeData} from '../../../src/lib/msig/propose'

function sampleAction(): Action {
    return Action.from({
        account: 'eon.shipload',
        name: 'setthreshold',
        authorization: [PermissionLevel.from('someplayer@active')],
        data: '', // empty bytes — fine for these structural assertions
    })
}

test('applyAuthorization replaces authorization but preserves account/name/data', () => {
    const original = sampleAction()
    const reauthed = applyAuthorization(original, PermissionLevel.from('eon.shipload@active'))
    expect(reauthed.account.toString()).toBe('eon.shipload')
    expect(reauthed.name.toString()).toBe('setthreshold')
    expect(reauthed.authorization.length).toBe(1)
    expect(reauthed.authorization[0].toString()).toBe('eon.shipload@active')
    expect(reauthed.data.toString()).toBe(original.data.toString())
})

test('buildProposeData assembles the propose action arguments', () => {
    const trx = Transaction.from({
        expiration: '2020-01-01T00:00:00',
        ref_block_num: 0,
        ref_block_prefix: 0,
        max_net_usage_words: 0,
        max_cpu_usage_ms: 0,
        delay_sec: 0,
        context_free_actions: [],
        actions: [sampleAction()],
        transaction_extensions: [],
    })
    const data = buildProposeData(
        Name.from('proposer'),
        Name.from('myproposal'),
        [PermissionLevel.from('alice@active'), PermissionLevel.from('bob@active')],
        trx,
    )
    expect(data.proposer.toString()).toBe('proposer')
    expect(data.proposal_name.toString()).toBe('myproposal')
    expect(data.requested.map((l) => l.toString())).toEqual(['alice@active', 'bob@active'])
    expect(data.trx.actions.length).toBe(1)
})
