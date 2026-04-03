import {Action, Int64, Name, NameType, UInt16, UInt32, UInt64, UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {CoordinatesType, EntityType, EntityTypeName} from '../types'
import {ServerContract} from '../contracts'

export type EntityRefInput = {
    entityType: EntityTypeName
    entityId: UInt64Type
}

export class ActionsManager extends BaseManager {
    travel(shipId: UInt64Type, destination: CoordinatesType, recharge = true): Action {
        const x = Int64.from(destination.x)
        const y = Int64.from(destination.y)

        return this.server.action('travel', {
            entity_type: EntityType.SHIP,
            id: UInt64.from(shipId),
            x,
            y,
            recharge,
        })
    }

    grouptravel(entities: EntityRefInput[], destination: CoordinatesType, recharge = true): Action {
        const entityRefs = entities.map((e) =>
            ServerContract.Types.entity_ref.from({
                entity_type: e.entityType,
                entity_id: UInt64.from(e.entityId),
            })
        )
        const x = Int64.from(destination.x)
        const y = Int64.from(destination.y)

        return this.server.action('grouptravel', {
            entities: entityRefs,
            x,
            y,
            recharge,
        })
    }

    resolve(entityId: UInt64Type, entityType: EntityTypeName = EntityType.SHIP): Action {
        return this.server.action('resolve', {
            entity_type: entityType,
            id: UInt64.from(entityId),
        })
    }

    cancel(
        entityId: UInt64Type,
        count: UInt64Type,
        entityType: EntityTypeName = EntityType.SHIP
    ): Action {
        return this.server.action('cancel', {
            entity_type: entityType,
            id: UInt64.from(entityId),
            count: UInt64.from(count),
        })
    }

    recharge(shipId: UInt64Type): Action {
        return this.server.action('recharge', {
            entity_type: EntityType.SHIP,
            id: UInt64.from(shipId),
        })
    }

    transfer(
        sourceType: EntityTypeName,
        sourceId: UInt64Type,
        destType: EntityTypeName,
        destId: UInt64Type,
        goodId: UInt64Type,
        quantity: UInt64Type
    ): Action {
        return this.server.action('transfer', {
            source_type: sourceType,
            source_id: UInt64.from(sourceId),
            dest_type: destType,
            dest_id: UInt64.from(destId),
            item_id: UInt16.from(goodId),
            quantity: UInt32.from(quantity),
        })
    }

    foundCompany(account: NameType, name: string): Action {
        return this.platform.action('foundcompany', {
            account: Name.from(account),
            name,
        })
    }

    join(account: NameType): Action {
        return this.server.action('join', {
            account: Name.from(account),
        })
    }

    extract(shipId: UInt64Type): Action {
        return this.server.action('extract', {
            ship_id: UInt64.from(shipId),
        })
    }

    warp(shipId: UInt64Type, destination: CoordinatesType): Action {
        const x = Int64.from(destination.x)
        const y = Int64.from(destination.y)

        return this.server.action('warp', {
            entity_type: EntityType.SHIP,
            id: UInt64.from(shipId),
            x,
            y,
        })
    }

    craft(
        entityType: EntityTypeName,
        entityId: UInt64Type,
        recipeId: number,
        quantity: number,
        inputs: {itemId: number; quantity: number; seed?: bigint}[]
    ): Action {
        const cargoInputs = inputs.map((i) =>
            ServerContract.Types.cargo_item.from({
                item_id: UInt16.from(i.itemId),
                quantity: UInt32.from(i.quantity),
                seed: i.seed !== undefined ? UInt64.from(i.seed) : null,
            })
        )
        return this.server.action('craft', {
            entity_type: entityType,
            id: UInt64.from(entityId),
            recipe_id: UInt16.from(recipeId),
            quantity: UInt32.from(quantity),
            inputs: cargoInputs,
        })
    }

    deploy(
        entityType: EntityTypeName,
        entityId: UInt64Type,
        packedItemId: number,
        seed: bigint,
        entityName: string
    ): Action {
        return this.server.action('deploy', {
            entity_type: entityType,
            id: UInt64.from(entityId),
            packed_item_id: UInt16.from(packedItemId),
            seed: UInt64.from(seed),
            entity_name: entityName,
        })
    }

    joinGame(account: NameType, companyName: string): Action[] {
        return [this.foundCompany(account, companyName), this.join(account)]
    }
}
