import type {APIClient} from '@wharfkit/antelope'
import {type Contract, ContractKit} from '@wharfkit/contract'
import {client as defaultClient} from '../client'

let cached: Promise<Contract> | null = null

/**
 * Load the eosio.msig contract (ABI fetched from chain, cached for the process).
 * eosio.msig is a system contract present on every chain we target.
 */
export function getMsigContract(apiClient: APIClient = defaultClient): Promise<Contract> {
    if (!cached) {
        cached = new ContractKit({client: apiClient}).load('eosio.msig')
    }
    return cached
}
