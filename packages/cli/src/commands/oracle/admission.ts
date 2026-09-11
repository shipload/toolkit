import {PrivateKey, type PublicKey} from '@wharfkit/antelope'
import {client, getShipload} from '../../lib/client'
import type {OracleConfig} from '../../lib/config'
import {ValidationError} from '../../lib/validate'
import type {AdmissionState} from './format'

export interface Admission {
    state: AdmissionState
    detail?: string
}

export interface Responsibility {
    target: number
    responsible: number
    secondsAway: number
}

export async function checkAdmission(cfg: OracleConfig): Promise<Admission> {
    let pub: PublicKey
    try {
        pub = PrivateKey.from(cfg.privateKey).toPublic()
    } catch {
        throw new ValidationError(
            'The oracle private_key in your config is not a valid Antelope key.',
            'Run `shiploadcli oracle setup <handle>` to generate a new one, or fix the [oracle] private_key value.'
        )
    }
    let account: Awaited<ReturnType<typeof client.v1.chain.get_account>>
    try {
        account = await client.v1.chain.get_account(cfg.actor)
    } catch (err) {
        return {state: 'unreachable', detail: (err as Error).message}
    }
    const perm = account.permissions.find((p) => String(p.perm_name) === cfg.permission)
    if (!perm) return {state: 'no-permission'}
    if (!perm.required_auth.keys.some((k) => k.key.equals(pub))) return {state: 'key-not-wired'}
    return {state: 'admitted'}
}

export function responsibleEpoch(opts: {
    handle: string
    target: number
    epochOracleIds?: string[]
}): number {
    if (!opts.epochOracleIds) return opts.target
    return opts.epochOracleIds.includes(opts.handle) ? opts.target : opts.target + 1
}

export async function resolveResponsibility(handle: string): Promise<Responsibility> {
    const shipload = await getShipload()
    const target = Number(await shipload.epochs.getFinalizedEpoch(true)) + 1
    const row = await shipload.epochs.getEpochRow(target)
    const responsible = responsibleEpoch({
        handle,
        target,
        epochOracleIds: row ? row.oracle_ids.map(String) : undefined,
    })
    const info = await shipload.epochs.getByHeight(responsible)
    const secondsAway = Math.max(0, Math.ceil((info.start.getTime() - Date.now()) / 1000))
    return {target, responsible, secondsAway}
}

export async function isRegistered(handle: string): Promise<boolean> {
    const shipload = await getShipload()
    const oracles = await shipload.epochs.getOracles()
    return oracles.some((o) => String(o.id) === handle)
}
