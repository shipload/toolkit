import {UInt16, type UInt16Type, UInt64, type UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import type {ServerContract} from '../contracts'

export interface GridCell {
    gx: number
    gy: number
}

export interface ClusterCell extends GridCell {
    entity: number
}

export interface Cluster {
    root: number
    cells: ClusterCell[]
}

export function computeFreeCells(footprint: GridCell[], occupied: ClusterCell[]): GridCell[] {
    const taken = new Set(occupied.map((c) => `${c.gx},${c.gy}`))
    return footprint.filter((c) => !taken.has(`${c.gx},${c.gy}`))
}

export class ClusterManager extends BaseManager {
    async getFootprint(itemId: UInt16Type): Promise<GridCell[]> {
        const res = (await this.server.readonly('getfootprint', {
            item_id: UInt16.from(itemId),
        })) as ServerContract.Types.footprint_result
        return res.cells.map((c) => ({gx: Number(c.gx), gy: Number(c.gy)}))
    }

    async getCluster(hubId: UInt64Type): Promise<Cluster> {
        const res = (await this.server.readonly('getcluster', {
            hub_id: UInt64.from(hubId),
        })) as ServerContract.Types.cluster_row
        return {
            root: Number(res.root),
            cells: res.cells.map((c) => ({
                gx: Number(c.gx),
                gy: Number(c.gy),
                entity: Number(c.entity),
            })),
        }
    }

    async freeCells(hubId: UInt64Type, hubItemId: UInt16Type): Promise<GridCell[]> {
        const [footprint, cluster] = await Promise.all([
            this.getFootprint(hubItemId),
            this.getCluster(hubId),
        ])
        return computeFreeCells(footprint, cluster.cells)
    }
}
