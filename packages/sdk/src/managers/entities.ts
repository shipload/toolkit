import {Name, type NameType, type UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {Entity} from '../entities/entity'
import type {EntityTypeName} from '../data/kind-registry'
import type {ServerContract} from '../contracts'

export type {EntityTypeName} from '../data/kind-registry'

export class EntitiesManager extends BaseManager {
    async getEntity(id: UInt64Type): Promise<Entity> {
        const result = await this.server.readonly('getentity', {
            entity_id: id,
        })
        return new Entity(result as ServerContract.Types.entity_info)
    }

    async getProjection(id: UInt64Type, taskCount?: number): Promise<unknown> {
        return this.server.readonly('getprojstate', {
            entity_id: id,
            task_count: taskCount,
        })
    }

    async getEntities(
        owner: NameType | ServerContract.Types.player_row,
        kind?: EntityTypeName
    ): Promise<Entity[]> {
        const ownerName = this.resolveOwner(owner)
        const result = await this.server.readonly('getentities', {
            owner: ownerName,
            entity_type: kind,
        })
        const entities = result as ServerContract.Types.entity_info[]
        return entities.map((e) => new Entity(e))
    }

    async getAllEntities(kind?: EntityTypeName): Promise<ServerContract.Types.entity_row[]> {
        const rows = await this.server.table('entity').all()
        if (!kind) {
            return rows
        }
        const wanted = Name.from(kind)
        return rows.filter((row) => wanted.equals(row.kind))
    }

    async getSummaries(
        owner: NameType | ServerContract.Types.player_row,
        kind?: EntityTypeName
    ): Promise<ServerContract.Types.entity_summary[]> {
        const ownerName = this.resolveOwner(owner)
        const result = await this.server.readonly('getsummaries', {
            owner: ownerName,
            entity_type: kind,
        })
        return result as ServerContract.Types.entity_summary[]
    }

    private resolveOwner(owner: NameType | ServerContract.Types.player_row): Name {
        if (typeof owner === 'object' && owner !== null && 'owner' in owner) {
            return owner.owner
        }
        return Name.from(owner)
    }
}
