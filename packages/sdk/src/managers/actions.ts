import {
    type Action,
    Int64,
    Name,
    type NameType,
    UInt16,
    type UInt16Type,
    UInt32,
    type UInt32Type,
    UInt64,
    type UInt64Type,
} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {type CoordinatesType, EntityType, type EntityTypeName} from '../types'
import {ServerContract} from '../contracts'

export type EntityRefInput = {
    entityType: NameType
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

    resolve(
        entityId: UInt64Type,
        entityType: EntityTypeName = EntityType.SHIP,
        count?: UInt64Type
    ): Action {
        const params: ServerContract.ActionParams.resolve = {
            entity_type: entityType,
            id: UInt64.from(entityId),
        }
        if (count !== undefined) {
            params.count = UInt64.from(count)
        }
        return this.server.action('resolve', params)
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

    recharge(entityId: UInt64Type, entityType: EntityTypeName = EntityType.SHIP): Action {
        return this.server.action('recharge', {
            entity_type: entityType,
            id: UInt64.from(entityId),
        })
    }

    transfer(
        sourceType: EntityTypeName,
        sourceId: UInt64Type,
        destType: EntityTypeName,
        destId: UInt64Type,
        items: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        const cargoItems = items.map((i) => ServerContract.Types.cargo_item.from(i))
        return this.server.action('transfer', {
            source_type: sourceType,
            source_id: UInt64.from(sourceId),
            dest_type: destType,
            dest_id: UInt64.from(destId),
            items: cargoItems,
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

    gather(
        source: EntityRefInput,
        destination: EntityRefInput,
        stratum: UInt16Type,
        quantity: UInt32Type
    ): Action {
        return this.server.action('gather', {
            source: ServerContract.Types.entity_ref.from({
                entity_type: source.entityType,
                entity_id: UInt64.from(source.entityId),
            }),
            destination: ServerContract.Types.entity_ref.from({
                entity_type: destination.entityType,
                entity_id: UInt64.from(destination.entityId),
            }),
            stratum: UInt16.from(stratum),
            quantity: UInt32.from(quantity),
        })
    }

    warp(
        entityId: UInt64Type,
        destination: CoordinatesType,
        entityType: EntityTypeName = EntityType.SHIP
    ): Action {
        const x = Int64.from(destination.x)
        const y = Int64.from(destination.y)

        return this.server.action('warp', {
            entity_type: entityType,
            id: UInt64.from(entityId),
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
        ref: ServerContract.ActionParams.Type.cargo_ref
    ): Action {
        return this.server.action('deploy', {
            entity_type: entityType,
            id: UInt64.from(entityId),
            ref: ServerContract.Types.cargo_ref.from(ref),
        })
    }

    addmodule(
        entityType: EntityTypeName,
        entityId: UInt64Type,
        moduleIndex: number,
        moduleRef: ServerContract.ActionParams.Type.cargo_ref,
        targetRef: ServerContract.ActionParams.Type.cargo_ref | null = null
    ): Action {
        return this.server.action('addmodule', {
            entity_type: entityType,
            entity_id: UInt64.from(entityId),
            module_index: moduleIndex,
            module_ref: ServerContract.Types.cargo_ref.from(moduleRef),
            target_ref: targetRef ? ServerContract.Types.cargo_ref.from(targetRef) : null,
        })
    }

    rmmodule(
        entityType: EntityTypeName,
        entityId: UInt64Type,
        moduleIndex: number,
        targetRef: ServerContract.ActionParams.Type.cargo_ref | null = null
    ): Action {
        return this.server.action('rmmodule', {
            entity_type: entityType,
            entity_id: UInt64.from(entityId),
            module_index: moduleIndex,
            target_ref: targetRef ? ServerContract.Types.cargo_ref.from(targetRef) : null,
        })
    }

    wrap(
        owner: NameType,
        entityType: EntityTypeName,
        entityId: UInt64Type,
        items: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        const cargoItems = items.map((i) => ServerContract.Types.cargo_item.from(i))
        return this.server.action('wrap', {
            owner: Name.from(owner),
            entity_type: entityType,
            entity_id: UInt64.from(entityId),
            items: cargoItems,
        })
    }

    undeploy(host: EntityRefInput, target: EntityRefInput): Action {
        return this.server.action('undeploy', {
            host_type: Name.from(host.entityType),
            host_id: UInt64.from(host.entityId),
            target_type: Name.from(target.entityType),
            target_id: UInt64.from(target.entityId),
        })
    }

    wrapEntity(entity: EntityRefInput): Action {
        return this.server.action('wrapentity', {
            entity_type: Name.from(entity.entityType),
            entity_id: UInt64.from(entity.entityId),
        })
    }

    demolish(entity: EntityRefInput): Action {
        return this.server.action('demolish', {
            entity_type: Name.from(entity.entityType),
            entity_id: UInt64.from(entity.entityId),
        })
    }

    joinGame(account: NameType, companyName: string): Action[] {
        return [this.foundCompany(account, companyName), this.join(account)]
    }
}
