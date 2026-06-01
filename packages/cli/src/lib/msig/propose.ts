import {Action, type APIClient, Name, type PermissionLevel, Transaction} from '@wharfkit/antelope'
import type {AnyAction, Session, TransactArgs} from '@wharfkit/session'
import {chain} from '../client'
import {confirm} from '../prompt'
import {unicoveProposalUrl} from '../unicove'
import {getMsigContract} from './contract'
import {generateRandomName} from './naming'
import type {ProposeOptions} from './options'
import {parseExpiry} from './options'
import {resolveRequested} from './resolve'

/** Return a copy of `action` with its authorization replaced by `level`. */
export function applyAuthorization(action: Action, level: PermissionLevel): Action {
    return Action.from({
        account: action.account,
        name: action.name,
        authorization: [level],
        data: action.data,
    })
}

/** Plain argument object for eosio.msig::propose (kept separate for unit testing). */
export function buildProposeData(
    proposer: Name,
    proposalName: Name,
    requested: PermissionLevel[],
    trx: Transaction,
) {
    return {proposer, proposal_name: proposalName, requested, trx}
}

/** Build the inner transaction (with a fresh TAPoS header) that the proposal wraps. */
export async function buildInnerTransaction(
    apiClient: APIClient,
    actions: Action[],
    expireSeconds: number,
): Promise<Transaction> {
    const info = await apiClient.v1.chain.get_info()
    return Transaction.from({
        ...info.getTransactionHeader(expireSeconds),
        actions,
        context_free_actions: [],
        transaction_extensions: [],
    })
}

function toActions(args: TransactArgs): Action[] {
    const raw: (Action | AnyAction)[] = args.action ? [args.action] : (args.actions ?? [])
    return raw.map((a) => (a instanceof Action ? a : Action.from(a as Action)))
}

function summarize(actions: Action[], requested: PermissionLevel[], proposalName: string): string {
    const lines: string[] = []
    lines.push(`Proposal: ${proposalName}`)
    lines.push('Actions:')
    for (const a of actions) {
        const auth = a.authorization.map((l) => l.toString()).join(', ')
        lines.push(`  - ${a.account}::${a.name}  (auth: ${auth})`)
    }
    lines.push(`Requested approvers: ${requested.map((l) => l.toString()).join(', ') || '(none resolved)'}`)
    return lines.join('\n')
}

export interface ProposeResult {
    txid: string
    proposer: string
    proposalName: string
    requested: PermissionLevel[]
}

/**
 * Wrap the action(s) in `args` into an eosio.msig::propose and broadcast it as `session`.
 * Throws on any error (caller's transact() wrapper handles error formatting).
 */
export async function proposeTransaction(
    session: Session,
    args: TransactArgs,
    opts: ProposeOptions,
): Promise<ProposeResult> {
    const apiClient = session.client
    let actions = toActions(args)
    if (opts.as) {
        actions = actions.map((a) => applyAuthorization(a, opts.as as PermissionLevel))
    }

    const expireSeconds = parseExpiry(opts.expires)
    const trx = await buildInnerTransaction(apiClient, actions, expireSeconds)
    const requested = await resolveRequested(apiClient, actions, opts.requested)
    const proposalName = opts.proposalName ?? generateRandomName()

    console.log(summarize(actions, requested, proposalName))
    if (!(await confirm('Post this proposal?', opts.yes))) {
        throw new Error('Aborted by user.')
    }

    const msig = await getMsigContract(apiClient)
    const proposeAction = msig.action(
        'propose',
        buildProposeData(session.actor, Name.from(proposalName), requested, trx),
        {authorization: [session.permissionLevel]},
    )

    const result = await session.transact({action: proposeAction}, {awaitIrreversible: true})
    const txid = String(result.response?.transaction_id ?? '')

    console.log()
    console.log(`Proposed "${proposalName}" by ${session.actor}.`)
    const url = unicoveProposalUrl(chain.id.toString(), session.actor.toString(), proposalName)
    if (url) {
        console.log('Share for approval:')
        console.log(`  ${url}`)
    }
    return {txid, proposer: session.actor.toString(), proposalName, requested}
}
