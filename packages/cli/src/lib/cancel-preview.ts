import {
    CancelBlockReason,
    cancelEligibility,
    cancelRefusalMessage,
    type CancelEligibilityInput,
    type CancelPlan,
    type Cluster,
    type ServerTypes,
} from '@shipload/sdk'

type EntityInfo = ServerTypes.entity_info

export interface CancelWorldSource {
    entity(id: string): Promise<EntityInfo>
    groupParticipants(groupId: string): Promise<string[]>
    cluster(hubId: string): Promise<Cluster>
    hubAt(owner: string, x: number, y: number): Promise<string | undefined>
}

export type CancelMode = {kind: 'all'} | {kind: 'from'; index: number}

const MAX_FETCH_ROUNDS = 6

export class CancelWorld {
    private readonly counterparts = new Map<string, EntityInfo>()
    private readonly groups = new Map<string, readonly string[]>()
    private readonly clusters = new Map<string, Cluster>()
    private readonly hubs = new Map<string, string | undefined>()

    constructor(
        private readonly source: CancelWorldSource,
        private readonly now: Date
    ) {}

    private input(): CancelEligibilityInput {
        return {
            now: this.now,
            counterparts: this.counterparts,
            groupParticipants: this.groups,
            clusters: this.clusters,
            hubAt: (owner, x, y) => this.hubs.get(`${owner}@${x},${y}`),
        }
    }

    // Runs the SDK predicate, fetching whatever a NEEDS result names, until it gives a verdict.
    async plan(entity: EntityInfo, laneKey: number, fromTaskIndex: number): Promise<CancelPlan> {
        for (let round = 0; ; round++) {
            const plan = cancelEligibility(entity, laneKey, fromTaskIndex, this.input())
            if (plan.blockedReason !== CancelBlockReason.NEEDS || !plan.needs) return plan
            if (round >= MAX_FETCH_ROUNDS) return plan
            const needs = plan.needs
            await Promise.all([
                ...needs.entities.map(async (id) =>
                    this.counterparts.set(id, await this.source.entity(id))
                ),
                ...needs.groups.map(async (id) =>
                    this.groups.set(id, await this.source.groupParticipants(id))
                ),
                ...needs.hubs.map(async (id) => this.clusters.set(id, await this.source.cluster(id))),
                ...needs.hubSites.map(async ({owner, x, y}) =>
                    this.hubs.set(`${owner}@${x},${y}`, await this.source.hubAt(owner, x, y))
                ),
            ])
        }
    }

    // The task index a cancel starts from: --from as given, --all the longest tail range the contract accepts.
    async resolve(
        entity: EntityInfo,
        laneKey: number,
        mode: CancelMode
    ): Promise<{fromTaskIndex: number; plan: CancelPlan}> {
        const lane = entity.lanes.find((l) => l.lane_key.equals(laneKey))
        const total = lane?.schedule.tasks.length ?? 0
        if (mode.kind === 'from') {
            return {fromTaskIndex: mode.index, plan: await this.plan(entity, laneKey, mode.index)}
        }
        let last: {fromTaskIndex: number; plan: CancelPlan} | undefined
        for (let from = 0; from < total; from++) {
            const plan = await this.plan(entity, laneKey, from)
            if (plan.ok) return {fromTaskIndex: from, plan}
            last = {fromTaskIndex: from, plan}
        }
        return last ?? {fromTaskIndex: 0, plan: await this.plan(entity, laneKey, 0)}
    }
}

export function cancelRefusalLine(plan: CancelPlan): string {
    const reason = plan.blockedReason
    if (reason === undefined) return 'the cancel is refused.'
    if (reason === CancelBlockReason.NEEDS) return 'could not load every entity this cancel touches.'
    const message = cancelRefusalMessage(reason) ?? 'the cancel is refused.'
    const counterpart = plan.blockedByCounterpart
    return counterpart ? `${message} (entity ${counterpart.entity_id.toString()})` : message
}
