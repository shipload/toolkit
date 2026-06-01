import type {PermissionLevel} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {parseAuth, parseAuthList} from './auth'
import {isValidProposalName} from './naming'

export interface ProposeOptions {
    /** Authority to stamp on the inner (proposed) action(s). */
    as?: PermissionLevel
    /** Explicit proposal name; generated if omitted. */
    proposalName?: string
    /** Raw expiry string (e.g. "30d"); resolved via parseExpiry at propose time. */
    expires?: string
    /** Manual approver override; skips chain resolution. */
    requested?: PermissionLevel[]
    /** Skip the confirmation prompt. */
    yes?: boolean
}

/** Raw option bag as produced by commander for a command using addProposeOptions. */
interface RawProposeOpts {
    propose?: boolean
    as?: string
    proposalName?: string
    expires?: string
    requested?: string
    yes?: boolean
}

const DEFAULT_EXPIRE_SECONDS = 30 * 24 * 60 * 60 // 30 days

/** Parse "30d" | "12h" | "45m" | "<seconds>" into a positive integer of seconds. */
export function parseExpiry(input: string | undefined): number {
    if (input === undefined) return DEFAULT_EXPIRE_SECONDS
    const match = /^(\d+)([dhm]?)$/.exec(input.trim())
    if (!match) throw new Error(`Invalid --expires value "${input}"; use e.g. 30d, 12h, 45m, or seconds.`)
    const value = Number(match[1])
    if (value <= 0) throw new Error(`Invalid --expires value "${input}"; must be greater than zero.`)
    const unit = match[2]
    const mult = unit === 'd' ? 86400 : unit === 'h' ? 3600 : unit === 'm' ? 60 : 1
    return value * mult
}

/** Register the shared propose flags on a command. Call this at registration time. */
export function addProposeOptions(cmd: Command): Command {
    return cmd
        .option('--propose', 'post this transaction as an eosio.msig proposal instead of signing directly')
        .option('--as <auth>', 'authority to stamp on the proposed action (account or account@permission)')
        .option('--proposal-name <name>', 'proposal name (a valid Antelope name; generated if omitted)')
        .option('--expires <duration>', 'proposal expiry: 30d, 12h, 45m, or raw seconds', '30d')
        .option('--requested <list>', 'comma-separated approver override, e.g. alice@active,bob')
        .option('--yes', 'skip the confirmation prompt')
}

/** Read parsed propose options from a command's option bag. Returns null when --propose is absent. */
export function readProposeOptions(opts: RawProposeOpts): ProposeOptions | null {
    if (!opts.propose) return null
    if (opts.proposalName !== undefined && !isValidProposalName(opts.proposalName)) {
        throw new Error(
            `Invalid --proposal-name "${opts.proposalName}"; must be a valid Antelope name (a-z, 1-5, dots, <=12 chars).`,
        )
    }
    return {
        as: opts.as !== undefined ? parseAuth(opts.as) : undefined,
        proposalName: opts.proposalName,
        expires: opts.expires,
        requested: opts.requested !== undefined ? parseAuthList(opts.requested) : undefined,
        yes: opts.yes ?? false,
    }
}
