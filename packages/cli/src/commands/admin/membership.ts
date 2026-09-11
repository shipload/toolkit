import {PublicKey} from '@wharfkit/antelope'
import {assertOracleHandle} from '../../lib/config'
import {checkLine, formatDuration} from '../../lib/format'

/** Parent permission every oracle handle hangs off on the server contract account. */
export const ORACLE_PARENT_PERMISSION = 'oracles'

const RESERVED_HANDLES = ['owner', 'active', ORACLE_PARENT_PERMISSION, 'eosio.code']

/** A refusal: an optional check line that already printed, plus what the deployer should do. */
export class MembershipAbort extends Error {
    constructor(
        public readonly line: string | undefined,
        public readonly advice: string
    ) {
        super(advice)
        this.name = 'MembershipAbort'
    }
}

export interface RegistrySnapshot {
    contract: string
    epoch: number
    oracles: string[]
    threshold: number
    /** Keys on `<contract>@<handle>`, or undefined when that permission does not exist. */
    permissionKeys?: string[]
}

export interface OnboardPlan {
    checks: string[]
    /** False when the permission already exists carrying exactly this key. */
    sendUpdateAuth: boolean
    /** Undefined when the policy threshold already matches the registry. */
    setThreshold?: number
}

export interface OffboardPlan {
    checks: string[]
    /** False when the handle permission is already gone. */
    sendDeleteAuth: boolean
    setThreshold?: number
}

/** The testnet quorum policy: two thirds of the oracles, and never fewer than two. */
export function policyThreshold(oracles: number): number {
    return Math.min(oracles, Math.max(2, Math.ceil((2 * oracles) / 3)))
}

function thresholdMove(from: number, to: number, oracles: number): string {
    const move = from === to ? `threshold ${from} holds` : `threshold ${from} -> ${to}`
    return `${move} for ${oracleCount(oracles)}`
}

function oracleCount(n: number): string {
    return n === 1 ? '1 oracle' : `${n} oracles`
}

function remainWord(n: number): string {
    return n === 1 ? 'remains' : 'remain'
}

export function assertAvailableHandle(handle: string): void {
    assertOracleHandle(handle)
    if (RESERVED_HANDLES.includes(handle)) {
        throw new MembershipAbort(
            undefined,
            `'${handle}' is not available as an oracle handle. Ask the operator to run\n\`shiploadcli oracle setup\` again with a different handle.`
        )
    }
}

export function assertPublicKey(pubkey: string): PublicKey {
    try {
        return PublicKey.from(pubkey)
    } catch {
        throw new MembershipAbort(
            undefined,
            `'${pubkey}' is not a public key. Paste the Public key line from the\noperator's setup output.`
        )
    }
}

export function planOnboard(handle: string, pubkey: string, snap: RegistrySnapshot): OnboardPlan {
    assertAvailableHandle(handle)
    const key = assertPublicKey(pubkey)
    const checks = [
        checkLine(
            'Checking chain',
            `${snap.contract}, epoch ${snap.epoch}, ${oracleCount(snap.oracles.length)}, threshold ${snap.threshold}`
        ),
    ]
    if (snap.oracles.includes(handle)) {
        throw new MembershipAbort(
            checkLine('Checking handle', `'${handle}' is already registered on ${snap.contract}`),
            `Nothing was sent. This command does not change the key on a live handle.\nTo give ${handle} a new key, offboard the handle and onboard it again.`
        )
    }
    const resulting = snap.oracles.length + 1
    const target = policyThreshold(resulting)
    const setThreshold = target === snap.threshold ? undefined : target
    if (snap.permissionKeys === undefined) {
        checks.push(checkLine('Checking handle', `'${handle}' is free`))
        checks.push(
            checkLine('Checking threshold', thresholdMove(snap.threshold, target, resulting))
        )
        return {checks, sendUpdateAuth: true, setThreshold}
    }
    const sameKey =
        snap.permissionKeys.length === 1 && PublicKey.from(snap.permissionKeys[0]).equals(key)
    if (!sameKey) {
        throw new MembershipAbort(
            checkLine('Checking handle', `${snap.contract}@${handle} exists with a different key`),
            'Nothing was sent. This command does not change the key on a live handle.'
        )
    }
    checks.push(checkLine('Checking handle', `${snap.contract}@${handle} already carries this key`))
    checks.push(checkLine('Checking threshold', thresholdMove(snap.threshold, target, resulting)))
    return {checks, sendUpdateAuth: false, setThreshold}
}

export function planOffboard(
    handle: string,
    snap: RegistrySnapshot,
    setThreshold?: number
): OffboardPlan {
    assertOracleHandle(handle)
    const checks = [
        checkLine(
            'Checking registry',
            `${oracleCount(snap.oracles.length)}, threshold ${snap.threshold}`
        ),
    ]
    if (!snap.oracles.includes(handle)) {
        throw new MembershipAbort(
            checkLine('Checking registry', `'${handle}' is not registered on ${snap.contract}`),
            'Nothing was sent.'
        )
    }
    const remaining = snap.oracles.length - 1
    if (remaining < 2) {
        const line =
            remaining === 0
                ? `'${handle}' is the only oracle`
                : `removing '${handle}' leaves ${oracleCount(remaining)}`
        throw new MembershipAbort(
            checkLine('Checking removal', line),
            'Nothing was sent. A quorum needs at least two oracles. Admit a replacement first.'
        )
    }
    if (setThreshold !== undefined) {
        if (setThreshold < 1) {
            throw new MembershipAbort(
                undefined,
                `--set-threshold ${setThreshold} is not viable: a quorum needs a threshold of at least 1.`
            )
        }
        if (setThreshold > remaining) {
            throw new MembershipAbort(
                undefined,
                `--set-threshold ${setThreshold} is not reachable: ${oracleCount(remaining)} ${remainWord(remaining)} after removing '${handle}'.`
            )
        }
        checks.push(
            checkLine(
                'Checking removal',
                `${oracleCount(remaining)} ${remainWord(remaining)}, threshold set to ${setThreshold}`
            )
        )
        return {checks, sendDeleteAuth: snap.permissionKeys !== undefined, setThreshold}
    }
    const target = policyThreshold(remaining)
    checks.push(
        checkLine('Checking removal', `${oracleCount(remaining)} ${remainWord(remaining)}`),
        checkLine('Checking threshold', thresholdMove(snap.threshold, target, remaining))
    )
    return {
        checks,
        sendDeleteAuth: snap.permissionKeys !== undefined,
        setThreshold: target === snap.threshold ? undefined : target,
    }
}

export function renderOnboardSummary(args: {
    handle: string
    contract: string
    oracles: number
    threshold: number
    target: number
    responsible: number
    secondsAway: number
}): string {
    const head = `${args.handle} is admitted. Registry: ${oracleCount(args.oracles)}, threshold ${args.threshold}.`
    const away = `about ${formatDuration(args.secondsAway)} away`
    const timing =
        args.responsible > args.target
            ? `Epoch ${args.target} is already under way with a fixed oracle set, so ${args.handle} is\nresponsible from epoch ${args.responsible}, ${away}.`
            : `${args.handle} is responsible from epoch ${args.responsible}, ${away}.`
    return [
        '',
        head,
        timing,
        'Their beacon picks this up within 60 seconds and needs no restart.',
    ].join('\n')
}

export function renderOffboardSummary(args: {
    handle: string
    deletedPermission: boolean
    target: number
    staysInTarget: boolean
}): string {
    const head = args.deletedPermission
        ? `${args.handle} is retired and its permission is deleted.`
        : `${args.handle} is retired.`
    const timing = args.staysInTarget
        ? `It stays in epoch ${args.target}'s fixed oracle set and drops out from epoch ${args.target + 1}.\nIts permission is gone, so it cannot reveal for epoch ${args.target}; the deadline close\nfinalizes that epoch if the reveals fall short.`
        : `It is out of the oracle set from epoch ${args.target}.`
    return ['', head, timing].join('\n')
}
