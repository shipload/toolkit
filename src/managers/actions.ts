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
        itemId: UInt64Type,
        stats: UInt64Type,
        quantity: UInt64Type
    ): Action {
        return this.server.action('transfer', {
            source_type: sourceType,
            source_id: UInt64.from(sourceId),
            dest_type: destType,
            dest_id: UInt64.from(destId),
            item_id: UInt16.from(itemId),
            stats: UInt64.from(stats),
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

    gather(shipId: UInt64Type, stratum: number, quantity: number): Action {
        return this.server.action('gather', {
            entity_type: EntityType.SHIP,
            id: UInt64.from(shipId),
            stratum: UInt16.from(stratum),
            quantity: UInt32.from(quantity),
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
        inputs: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        const cargoInputs = inputs.map((i) => ServerContract.Types.cargo_item.from(i))
        return this.server.action('craft', {
            entity_type: entityType,
            id: UInt64.from(entityId),
            recipe_id: UInt16.from(recipeId),
            quantity: UInt32.from(quantity),
            inputs: cargoInputs,
        })
    }

    blend(
        entityType: EntityTypeName,
        entityId: UInt64Type,
        inputs: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        const cargoInputs = inputs.map((i) => ServerContract.Types.cargo_item.from(i))
        return this.server.action('blend', {
            entity_type: entityType,
            id: UInt64.from(entityId),
            inputs: cargoInputs,
        })
    }

    deploy(
        entityType: EntityTypeName,
        entityId: UInt64Type,
        packedItemId: number,
        stats: bigint,
        entityName: string
    ): Action {
        return this.server.action('deploy', {
            entity_type: entityType,
            id: UInt64.from(entityId),
            packed_item_id: UInt16.from(packedItemId),
            stats: UInt64.from(stats),
            entity_name: entityName,
        })
    }

    addmodule(
        entityType: EntityTypeName,
        entityId: UInt64Type,
        moduleIndex: number,
        moduleCargoId: UInt64Type,
        targetCargoId: UInt64Type = UInt64.from(0)
    ): Action {
        return this.server.action('addmodule', {
            entity_type: entityType,
            entity_id: UInt64.from(entityId),
            module_index: moduleIndex,
            module_cargo_id: UInt64.from(moduleCargoId),
            target_cargo_id: UInt64.from(targetCargoId),
        })
    }

    rmmodule(
        entityType: EntityTypeName,
        entityId: UInt64Type,
        moduleIndex: number,
        targetCargoId: UInt64Type = UInt64.from(0)
    ): Action {
        return this.server.action('rmmodule', {
            entity_type: entityType,
            entity_id: UInt64.from(entityId),
            module_index: moduleIndex,
            target_cargo_id: UInt64.from(targetCargoId),
        })
    }

    joinGame(account: NameType, companyName: string): Action[] {
        return [this.foundCompany(account, companyName), this.join(account)]
    }
}
