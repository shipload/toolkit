import {shuttleCandidates, type CandidateEntity, type Shipload, type ServerTypes} from '@shipload/sdk'

export type EntityRowFetcher = (id: bigint | number) => Promise<ServerTypes.entity_row>

function ownedEntityToCandidate(e: ServerTypes.entity_info): CandidateEntity {
    return {
        id: e.id,
        owner: e.owner,
        kind: e.type,
        coordinates: e.coordinates,
        modules: e.modules,
        item_id: e.item_id,
        lanes: e.lanes,
    }
}

export async function resolveShuttleCandidatePool(
    sl: Shipload,
    buildingId: bigint,
    shipId: bigint,
    extraCandidateIds: bigint[],
    player: string,
    fetchRow: EntityRowFetcher
): Promise<bigint[]> {
    const [buildingRow, owned, civicOwner] = await Promise.all([
        fetchRow(buildingId),
        sl.entities.getEntities(player),
        sl.influence.getCivicOwner(),
    ])
    const extraRows = await Promise.all(extraCandidateIds.map((id) => fetchRow(id)))
    const pool = shuttleCandidates(
        {building: buildingRow, shipId, player},
        [...owned.map(ownedEntityToCandidate), ...extraRows],
        civicOwner.toString()
    )
    return pool.map((id) => BigInt(id))
}
