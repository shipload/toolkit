import {
    type Action,
    type APIClient,
    type BytesType,
    type Checksum256,
    type NameType,
    PackedTransaction,
    PermissionLevel,
    type PermissionLevelType,
    Serializer,
    type Transaction,
} from '@wharfkit/antelope'
import {gameContractName, platform, platformContractName, server} from '../client'
import {getMsigContract} from './contract'

/** Decode an eosio.msig proposal's packed_transaction into a Transaction + its hash. */
export function decodeProposalTransaction(packedTrx: BytesType): {
    transaction: Transaction
    hash: Checksum256
} {
    const packed = PackedTransaction.from({
        compression: false,
        signatures: [],
        packed_trx: packedTrx,
        packed_context_free_data: '',
    })
    const transaction = packed.getTransaction()
    return {transaction, hash: transaction.id}
}

export interface ProposalView {
    proposer: string
    name: string
    hash: Checksum256
    transaction: Transaction
    requestedApprovals: PermissionLevel[]
    providedApprovals: PermissionLevel[]
}

/** Read a pending proposal (proposal + approvals2 tables). Returns null if not found. */
export async function readProposal(
    apiClient: APIClient,
    proposer: NameType,
    name: NameType,
): Promise<ProposalView | null> {
    const msig = await getMsigContract(apiClient)
    const proposalRow = (await msig.table('proposal', proposer).get(name)) as
        | {packed_transaction: BytesType}
        | undefined
    if (!proposalRow) return null

    const {transaction, hash} = decodeProposalTransaction(proposalRow.packed_transaction)

    const approvals = (await msig.table('approvals2', proposer).get(name)) as
        | {
              requested_approvals: {level: PermissionLevelType}[]
              provided_approvals: {level: PermissionLevelType}[]
          }
        | undefined

    return {
        proposer: String(proposer),
        name: String(name),
        hash,
        transaction,
        requestedApprovals: approvals
            ? approvals.requested_approvals.map((a) => PermissionLevel.from(a.level))
            : [],
        providedApprovals: approvals
            ? approvals.provided_approvals.map((a) => PermissionLevel.from(a.level))
            : [],
    }
}

type OnchainAbi = Awaited<ReturnType<APIClient['v1']['chain']['get_abi']>>['abi']
const onchainAbiCache = new Map<string, OnchainAbi>()

/** Resolve an account's ABI, preferring the SDK's bundled game/platform ABI, then a (cached) on-chain fetch. */
async function resolveAbi(apiClient: APIClient, account: NameType) {
    const name = String(account)
    if (name === gameContractName) return server.abi
    if (name === platformContractName) return platform.abi
    if (!onchainAbiCache.has(name)) {
        onchainAbiCache.set(name, (await apiClient.v1.chain.get_abi(account)).abi)
    }
    return onchainAbiCache.get(name)
}

/** Best-effort decode of an action's data via its resolved ABI; falls back to raw bytes. */
export async function decodeActionData(apiClient: APIClient, action: Action): Promise<unknown> {
    try {
        const abi = await resolveAbi(apiClient, action.account)
        if (!abi) return action.data.toString()
        const actionDef = abi.actions.find((a) => String(a.name) === action.name.toString())
        if (!actionDef) return action.data.toString()
        return Serializer.decode({data: action.data, abi, type: String(actionDef.type)})
    } catch {
        return action.data.toString()
    }
}

/** Print each proposal action as "account::name [(auth: …)]" followed by its decoded data. */
export async function printProposalActions(
    apiClient: APIClient,
    actions: Action[],
    showAuth = false,
): Promise<void> {
    for (const action of actions) {
        const auth = showAuth
            ? `  (auth: ${action.authorization.map((l) => l.toString()).join(', ')})`
            : ''
        console.log(`  - ${action.account}::${action.name}${auth}`)
        console.log(`    ${JSON.stringify(await decodeActionData(apiClient, action))}`)
    }
}
