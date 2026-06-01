import type {Action, Authority, Name, NameType} from '@wharfkit/antelope'
import {PermissionLevel} from '@wharfkit/antelope'

/** Minimal structural subset of APIClient needed to resolve authorities. APIClient satisfies this. */
export interface AccountLookup {
    v1: {
        chain: {
            get_account(name: NameType): Promise<{
                permissions: Array<{perm_name: Name; required_auth: Authority}>
            }>
        }
    }
}

/**
 * Walk an authority's required_auth.accounts to find the leaf approvers.
 * Adapted from unicove's resolveSigners (eosio.prods producer-multisig case dropped).
 */
export async function resolveSigners(
    lookup: AccountLookup,
    auth: PermissionLevel,
    seen: Set<string>,
): Promise<PermissionLevel[]> {
    const key = String(auth)
    if (seen.has(key)) return []
    seen.add(key)

    const account = await lookup.v1.chain.get_account(auth.actor)
    const permission = account.permissions.find((p) => p.perm_name.equals(auth.permission))
    if (!permission) return [auth]

    const accountAuths = permission.required_auth.accounts
        .map((a) => a.permission)
        .filter((level) => !level.permission.equals('eosio.code'))
    if (accountAuths.length === 1 && permission.required_auth.threshold.equals(1)) {
        return resolveSigners(lookup, accountAuths[0], seen)
    }
    if (accountAuths.length > 0) {
        return accountAuths
    }
    return [auth]
}

/**
 * Resolve the full requested-approver set for a set of actions. If `override` is supplied,
 * chain resolution is skipped entirely. Results are deduped by "actor@permission".
 */
export async function resolveRequested(
    lookup: AccountLookup,
    actions: Action[],
    override?: PermissionLevel[],
): Promise<PermissionLevel[]> {
    if (override && override.length > 0) return dedupe(override)
    const seen = new Set<string>()
    const requested: PermissionLevel[] = []
    for (const action of actions) {
        for (const auth of action.authorization) {
            requested.push(...(await resolveSigners(lookup, auth, seen)))
        }
    }
    return dedupe(requested)
}

function dedupe(levels: PermissionLevel[]): PermissionLevel[] {
    const seen = new Set<string>()
    const out: PermissionLevel[] = []
    for (const lvl of levels) {
        const key = String(lvl)
        if (seen.has(key)) continue
        seen.add(key)
        out.push(lvl)
    }
    return out
}
