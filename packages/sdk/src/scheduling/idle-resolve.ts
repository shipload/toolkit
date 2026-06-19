import type {Action, UInt64} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import type {ActionsManager} from '../managers/actions'
import {hasResolvable, type ScheduleData} from './schedule'

type EntityInfo = ServerContract.Types.entity_info

export type CounterpartLookup = (entityId: UInt64) => EntityInfo | undefined

export type IdleResolveTarget = ScheduleData & {id: UInt64}

// A hold's driving task lives on its counterpart, so a hold resolves the counterpart, never the blocker.
export function composeIdleResolve(
    blocker: IdleResolveTarget,
    action: Action,
    actions: ActionsManager,
    now: Date,
    lookupCounterpart?: CounterpartLookup
): Action[] {
    const ids: UInt64[] = []
    const seen = new Set<string>()

    const add = (id: UInt64) => {
        const key = id.toString()
        if (seen.has(key)) return
        seen.add(key)
        ids.push(id)
    }

    if (hasResolvable(blocker, now)) {
        add(blocker.id)
    }

    // Without a lookup we cannot confirm the counterpart has a completed task, so skip it.
    if (lookupCounterpart) {
        for (const hold of blocker.holds ?? []) {
            const counterpartId = hold.counterpart.entity_id
            const counterpart = lookupCounterpart(counterpartId)
            if (!counterpart || !hasResolvable(counterpart, now)) continue
            add(counterpartId)
        }
    }

    return [...ids.map((id) => actions.resolve(id)), action]
}
