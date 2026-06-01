import {expect, test} from 'bun:test'
import {Action, PermissionLevel, Serializer, Transaction} from '@wharfkit/antelope'
import {decodeProposalTransaction} from '../../../src/lib/msig/read'

test('decodeProposalTransaction round-trips packed bytes and matches the transaction id', () => {
    const trx = Transaction.from({
        expiration: '2030-01-01T00:00:00',
        ref_block_num: 1234,
        ref_block_prefix: 56789,
        max_net_usage_words: 0,
        max_cpu_usage_ms: 0,
        delay_sec: 0,
        context_free_actions: [],
        actions: [
            Action.from({
                account: 'eon.shipload',
                name: 'setthreshold',
                authorization: [PermissionLevel.from('eon.shipload@active')],
                data: '',
            }),
        ],
        transaction_extensions: [],
    })
    const packedTrx = Serializer.encode({object: trx})

    const {transaction, hash} = decodeProposalTransaction(packedTrx)
    expect(hash.equals(trx.id)).toBe(true)
    expect(transaction.actions[0].name.toString()).toBe('setthreshold')
})
