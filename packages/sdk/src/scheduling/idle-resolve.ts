import type {Action, UInt64} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import {civicSettleRounds} from '../influence/civic-shuttle'
import {isCivicEntity} from '../influence/civic'
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
    const resolves: Action[] = []
    const seen = new Set<string>()

    const add = (id: UInt64, rounds = 1) => {
        const key = id.toString()
        if (seen.has(key)) return
        seen.add(key)
        for (let i = 0; i < rounds; i++) resolves.push(actions.resolve(id))
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
            const rounds = civicSettleRounds(counterpart, now, [blocker.id])
            // only a civic entity's resolve stops at CIVIC_SETTLE_LIMIT; it belongs to the account every action names
            const civic =
                rounds > 1 && isCivicEntity(counterpart, actions.resolve(counterpartId).account)
            add(counterpartId, civic ? rounds : 1)
        }
    }

    return [...resolves, action]
}
