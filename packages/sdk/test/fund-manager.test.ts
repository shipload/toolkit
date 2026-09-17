import {expect, test} from 'bun:test'
import {APIClient, Serializer} from '@wharfkit/antelope'
import {Chains} from '@wharfkit/common'
import {Shipload, FundManager} from '../src'
import {FundContract, PlatformContract} from '../src/contracts'

function fixture(rows: unknown[] = [], fundName = 'fnd.shipload') {
    const calls: {path: string; params: Record<string, unknown>}[] = []
    const client = new APIClient({
        provider: {
            async call({path, params}) {
                const request = JSON.parse(JSON.stringify(params))
                calls.push({path, params: request})
                const abi = request.table === 'balance' ? PlatformContract.abi : FundContract.abi
                const types: Record<string, string> = {
                    benefs: 'benef_row',
                    tokens: 'token_row',
                    accrued: 'accrued_row',
                    balance: 'balance_row',
                }
                const encoded = rows.map(
                    (object) =>
                        Serializer.encode({object, abi, type: types[request.table]}).hexString
                )
                return {
                    status: 200,
                    headers: {},
                    text: '',
                    json: {rows: encoded, more: false, next_key: ''},
                }
            },
        },
    })
    const fundContract = new FundContract.Contract({client, account: fundName})
    return {sdk: new Shipload(Chains.Jungle4, {client, fundContract}), calls}
}

test('fund readers preserve the raw contract and expose the public manager', () => {
    const {sdk} = fixture()
    expect(sdk.funds).toBeInstanceOf(FundManager)
    expect(sdk.funds).toBe(sdk.funds)
    expect(String(sdk.fund.account)).toBe('fnd.shipload')
})

test('beneficiaries read from the configured fund scope', async () => {
    const {sdk, calls} = fixture([{account: 'teamgreymass', bps: 10000}], 'otherfund')
    const rows = await sdk.funds.getBeneficiaries()
    expect(String(rows[0].account)).toBe('teamgreymass')
    expect(Number(rows[0].bps)).toBe(10000)
    expect(calls[0].params).toMatchObject({code: 'otherfund', scope: 'otherfund', table: 'benefs'})
})

test('accepted tokens retain their own precision', async () => {
    const {sdk} = fixture([
        {token_contract: 'eosio.token', token_symbol: '4,EOS'},
        {token_contract: 'scrap.gm', token_symbol: '0,SCRAP'},
    ])
    expect((await sdk.funds.getTokens()).map((r) => String(r.symbol))).toEqual(['4,EOS', '0,SCRAP'])
})

test('accrued uses beneficiary scope and preserves zero rows without filtering accepted tokens', async () => {
    const {sdk, calls} = fixture([
        {token_contract: 'eosio.token', balance: '1.9000 EOS'},
        {token_contract: 'scrap.gm', balance: '0 SCRAP'},
    ])
    const rows = await sdk.funds.getAccrued('teamgreymass')
    expect(rows.map((r) => String(r.balance))).toEqual(['1.9000 EOS', '0 SCRAP'])
    expect(String(rows[1].tokenContract)).toBe('scrap.gm')
    expect(calls).toHaveLength(1)
    expect(calls[0].params).toMatchObject({table: 'accrued', scope: 'teamgreymass'})
})

test('a beneficiary with no accrued rows returns an empty array', async () => {
    const {sdk} = fixture()
    expect(await sdk.funds.getAccrued('nobody')).toEqual([])
})

test('uncollected reads platform balances using the configured fund as owner', async () => {
    const {sdk, calls} = fixture([{token_contract: 'scrap.gm', balance: '10 SCRAP'}], 'otherfund')
    const rows = await sdk.funds.getUncollected()
    expect(String(rows[0].owner)).toBe('otherfund')
    expect(String(rows[0].balance)).toBe('10 SCRAP')
    expect(calls[0].params).toMatchObject({
        code: 'nex.shipload',
        scope: 'otherfund',
        table: 'balance',
    })
})

test('claim and collect helpers target the configured fund and serialize the deployed ABI', () => {
    const {sdk} = fixture([], 'otherfund')
    const claim = sdk.actions.claimFund('teamgreymass')
    expect(String(claim.account)).toBe('otherfund')
    expect(String(claim.name)).toBe('claim')
    expect(String(claim.decodeData(FundContract.abi).beneficiary_account)).toBe('teamgreymass')
    const collect = sdk.actions.collectFund()
    expect(String(collect.account)).toBe('otherfund')
    expect(String(collect.name)).toBe('collect')
    expect(Serializer.objectify(collect.decodeData(FundContract.abi))).toEqual({})
})
