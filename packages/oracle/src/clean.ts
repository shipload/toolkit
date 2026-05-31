import type {Action, UInt64} from '@wharfkit/antelope'
import type {SessionLike} from './run-once'

export interface MaintenanceReads {
    getFinalizedEpoch(): Promise<UInt64>
    getReserveScopes(): Promise<{epoch: number; count: number}[]>
}

export interface MaintenanceActions {
    cleanrsvp(epoch: number, maxRows: number): Action
}

export interface MaintenanceDeps {
    reads: MaintenanceReads
    actions: MaintenanceActions
    session: SessionLike
}

export type CleanResult =
    | {kind: 'cleaned'; epoch: number; rows: number}
    | {kind: 'nothing-to-clean'}

export async function cleanOldestReserveScope(
    deps: MaintenanceDeps,
    maxRows: number
): Promise<CleanResult> {
    const {reads, actions, session} = deps
    const [finalizedU, scopes] = await Promise.all([
        reads.getFinalizedEpoch(),
        reads.getReserveScopes(),
    ])
    const finalized = Number(finalizedU)
    const cleanable = scopes
        .filter((s) => s.epoch < finalized && s.count > 0)
        .sort((a, b) => a.epoch - b.epoch)
    const oldest = cleanable[0]
    if (!oldest) {
        return {kind: 'nothing-to-clean'}
    }
    await session.transact({action: actions.cleanrsvp(oldest.epoch, maxRows)})
    return {kind: 'cleaned', epoch: oldest.epoch, rows: Math.min(oldest.count, maxRows)}
}
