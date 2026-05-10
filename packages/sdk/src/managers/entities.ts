import {Name, type NameType, type UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {Ship} from '../entities/ship'
import {Warehouse} from '../entities/warehouse'
import {Container} from '../entities/container'
import {Extractor} from '../entities/extractor'
import type {ServerContract} from '../contracts'

export type EntityType = 'ship' | 'warehouse' | 'extractor' | 'container'

export class EntitiesManager extends BaseManager {
    async getEntity(id: UInt64Type): Promise<Ship | Warehouse | Extractor | Container> {
        const result = await this.server.readonly('getentity', {
            entity_id: id,
        })
        const entityInfo = result as ServerContract.Types.entity_info
        return this.wrapEntity(entityInfo)
    }

    async getEntities(
        owner: NameType | ServerContract.Types.player_row,
        type?: EntityType
    ): Promise<(Ship | Warehouse | Extractor | Container)[]> {
        const ownerName = this.resolveOwner(owner)
        const result = await this.server.readonly('getentities', {
            owner: ownerName,
            entity_type: type,
        })
        const entities = result as ServerContract.Types.entity_info[]
        return entities.map((entity) => this.wrapEntity(entity))
    }

    async getSummaries(
        owner: NameType | ServerContract.Types.player_row,
        type?: EntityType
    ): Promise<ServerContract.Types.entity_summary[]> {
        const ownerName = this.resolveOwner(owner)
        const result = await this.server.readonly('getsummaries', {
            owner: ownerName,
            entity_type: type,
        })
        return result as ServerContract.Types.entity_summary[]
    }

    async getShip(id: UInt64Type): Promise<Ship> {
        return (await this.getEntity(id)) as Ship
    }

    async getWarehouse(id: UInt64Type): Promise<Warehouse> {
        return (await this.getEntity(id)) as Warehouse
    }

    async getContainer(id: UInt64Type): Promise<Container> {
        return (await this.getEntity(id)) as Container
    }

    async getExtractor(id: UInt64Type): Promise<Extractor> {
        return (await this.getEntity(id)) as Extractor
    }

    async getShips(owner: NameType | ServerContract.Types.player_row): Promise<Ship[]> {
        return (await this.getEntities(owner, 'ship')) as Ship[]
    }

    async getWarehouses(owner: NameType | ServerContract.Types.player_row): Promise<Warehouse[]> {
        return (await this.getEntities(owner, 'warehouse')) as Warehouse[]
    }

    async getContainers(owner: NameType | ServerContract.Types.player_row): Promise<Container[]> {
        return (await this.getEntities(owner, 'container')) as Container[]
    }

    async getExtractors(owner: NameType | ServerContract.Types.player_row): Promise<Extractor[]> {
        return (await this.getEntities(owner, 'extractor')) as Extractor[]
    }

    async getShipSummaries(
        owner: NameType | ServerContract.Types.player_row
    ): Promise<ServerContract.Types.entity_summary[]> {
        return this.getSummaries(owner, 'ship')
    }

    async getWarehouseSummaries(
        owner: NameType | ServerContract.Types.player_row
    ): Promise<ServerContract.Types.entity_summary[]> {
        return this.getSummaries(owner, 'warehouse')
    }

    async getContainerSummaries(
        owner: NameType | ServerContract.Types.player_row
    ): Promise<ServerContract.Types.entity_summary[]> {
        return this.getSummaries(owner, 'container')
    }

    async getExtractorSummaries(
        owner: NameType | ServerContract.Types.player_row
    ): Promise<ServerContract.Types.entity_summary[]> {
        return this.getSummaries(owner, 'extractor')
    }

    private wrapEntity(
        entity: ServerContract.Types.entity_info
    ): Ship | Warehouse | Extractor | Container {
        if (entity.type.equals('ship')) return new Ship(entity)
        if (entity.type.equals('warehouse')) return new Warehouse(entity)
        if (entity.type.equals('extractor')) return new Extractor(entity)
        if (entity.type.equals('container')) return new Container(entity)
        throw new Error(`unknown entity type: ${entity.type}`)
    }

    private resolveOwner(owner: NameType | ServerContract.Types.player_row): Name {
        if (typeof owner === 'object' && owner !== null && 'owner' in owner) {
            return owner.owner
        }
        return Name.from(owner)
    }
}
