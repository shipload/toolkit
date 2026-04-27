import {Name, NameType, UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {Ship} from '../entities/ship'
import {Warehouse} from '../entities/warehouse'
import {Container} from '../entities/container'
import {ServerContract} from '../contracts'

export type EntityType = 'ship' | 'warehouse' | 'container' | 'location'

export class EntitiesManager extends BaseManager {
    async getEntity(type: EntityType, id: UInt64Type): Promise<Ship | Warehouse | Container> {
        const result = await this.server.readonly('getentity', {
            entity_type: Name.from(type),
            entity_id: id,
        })
        const entityInfo = result as ServerContract.Types.entity_info
        return this.wrapEntity(entityInfo)
    }

    async getEntities(
        owner: NameType | ServerContract.Types.player_row,
        type?: EntityType
    ): Promise<(Ship | Warehouse | Container)[]> {
        const ownerName = this.resolveOwner(owner)
        const result = await this.server.readonly('getentities', {
            owner: ownerName,
            entity_type: type ? Name.from(type) : null,
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
            entity_type: type ? Name.from(type) : null,
        })
        return result as ServerContract.Types.entity_summary[]
    }

    async getShip(id: UInt64Type): Promise<Ship> {
        return (await this.getEntity('ship', id)) as Ship
    }

    async getWarehouse(id: UInt64Type): Promise<Warehouse> {
        return (await this.getEntity('warehouse', id)) as Warehouse
    }

    async getContainer(id: UInt64Type): Promise<Container> {
        return (await this.getEntity('container', id)) as Container
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

    private wrapEntity(entity: ServerContract.Types.entity_info): Ship | Warehouse | Container {
        if (entity.type.equals('ship')) {
            return new Ship(entity)
        } else if (entity.type.equals('warehouse')) {
            return new Warehouse(entity)
        } else {
            return new Container(entity)
        }
    }

    private resolveOwner(owner: NameType | ServerContract.Types.player_row): Name {
        if (typeof owner === 'object' && owner !== null && 'owner' in owner) {
            return owner.owner
        }
        return Name.from(owner)
    }
}
