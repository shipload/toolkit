import {getKindMeta, isHub} from '@shipload/sdk'
import {Command} from 'commander'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {ValidationError} from '../../lib/validate'
import {type ClusterOccupant, formatClusterGrid} from '../../lib/cluster-grid'

export async function runCluster(ctx: EntityContext): Promise<void> {
    await withValidation(async () => {
        const sl = await getShipload()
        const hub = await sl.entities.getEntity(ctx.entityId)
        if (!isHub({type: hub.type})) {
            throw new ValidationError(`entity ${ctx.entityId} is not a hub`)
        }
        const hubLabel = getKindMeta(hub.type)?.defaultLabel ?? hub.type.toString()

        const [footprint, cluster, roster] = await Promise.all([
            sl.clusters.getFootprint(hub.item_id),
            sl.clusters.getCluster(ctx.entityId),
            sl.entities.getEntities(hub.owner),
        ])
        const byId = new Map(roster.map((e) => [Number(e.id), e]))

        const occupants: ClusterOccupant[] = cluster.cells.map((c) => {
            const e = byId.get(c.entity)
            const label = e ? (getKindMeta(e.type)?.defaultLabel ?? e.type.toString()) : '??'
            return {gx: c.gx, gy: c.gy, entityId: c.entity, label}
        })

        console.log(
            formatClusterGrid({
                hub: {
                    id: Number(hub.id),
                    label: hubLabel,
                    x: Number(hub.coordinates.x),
                    y: Number(hub.coordinates.y),
                },
                footprint,
                occupants,
            })
        )
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'cluster',
    description: "Show this hub's footprint, occupied cells, and free cells",
    appliesTo: ['hub'],
    build: (ctx) =>
        new Command('cluster')
            .description("Show this hub's footprint, occupied cells, and free cells")
            .action(async () => {
                await runCluster(ctx)
            }),
}
