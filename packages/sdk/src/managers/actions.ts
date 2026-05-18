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
import type {CoordinatesType} from '../types'
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

    resolve(entityId: UInt64Type, count?: UInt64Type): Action {
        const params: ServerContract.ActionParams.resolve = {
            id: UInt64.from(entityId),
        }
        if (count !== undefined) {
            params.count = UInt64.from(count)
        }
        return this.server.action('resolve', params)
    }

    cancel(entityId: UInt64Type, count: UInt64Type): Action {
        return this.server.action('cancel', {
            id: UInt64.from(entityId),
            count: UInt64.from(count),
        })
    }

    recharge(entityId: UInt64Type): Action {
        return this.server.action('recharge', {
            id: UInt64.from(entityId),
        })
    }

    refrshentity(entityId: UInt64Type): Action {
        return this.server.action('refrshentity', {
            entity_id: UInt64.from(entityId),
        })
    }

    transfer(
        sourceId: UInt64Type,
        destId: UInt64Type,
        items: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        return this.server.action('transfer', {
            source_id: UInt64.from(sourceId),
            dest_id: UInt64.from(destId),
            items,
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
        sourceId: UInt64Type,
        destinationId: UInt64Type,
        stratum: UInt16Type,
        quantity: UInt32Type
    ): Action {
        return this.server.action('gather', {
            source_id: UInt64.from(sourceId),
            destination_id: UInt64.from(destinationId),
            stratum: UInt16.from(stratum),
            quantity: UInt32.from(quantity),
        })
    }

    warp(entityId: UInt64Type, destination: CoordinatesType): Action {
        const x = Int64.from(destination.x)
        const y = Int64.from(destination.y)

        return this.server.action('warp', {
            id: UInt64.from(entityId),
            x,
            y,
        })
    }

    craft(
        entityId: UInt64Type,
        recipeId: number,
        quantity: number,
        inputs: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        return this.server.action('craft', {
            id: UInt64.from(entityId),
            recipe_id: UInt16.from(recipeId),
            quantity: UInt32.from(quantity),
            inputs,
        })
    }

    blend(entityId: UInt64Type, inputs: ServerContract.ActionParams.Type.cargo_item[]): Action {
        return this.server.action('blend', {
            id: UInt64.from(entityId),
            inputs,
        })
    }

    deploy(entityId: UInt64Type, ref: ServerContract.ActionParams.Type.cargo_ref): Action {
        return this.server.action('deploy', {
            id: UInt64.from(entityId),
            ref,
        })
    }

    addmodule(
        entityId: UInt64Type,
        moduleIndex: number,
        moduleRef: ServerContract.ActionParams.Type.cargo_ref,
        targetRef: ServerContract.ActionParams.Type.cargo_ref | null = null
    ): Action {
        return this.server.action('addmodule', {
            entity_id: UInt64.from(entityId),
            module_index: moduleIndex,
            module_ref: moduleRef,
            target_ref: targetRef ?? undefined,
        })
    }

    rmmodule(
        entityId: UInt64Type,
        moduleIndex: number,
        targetRef: ServerContract.ActionParams.Type.cargo_ref | null = null
    ): Action {
        return this.server.action('rmmodule', {
            entity_id: UInt64.from(entityId),
            module_index: moduleIndex,
            target_ref: targetRef ?? undefined,
        })
    }

    wrap(
        owner: NameType,
        entityId: UInt64Type,
        nexusId: UInt64Type,
        items: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        return this.server.action('wrap', {
            owner: Name.from(owner),
            entity_id: UInt64.from(entityId),
            nexus_id: UInt64.from(nexusId),
            items,
        })
    }

    undeploy(hostId: UInt64Type, targetId: UInt64Type): Action {
        return this.server.action('undeploy', {
            host_id: UInt64.from(hostId),
            target_id: UInt64.from(targetId),
        })
    }

    wrapEntity(entityId: UInt64Type, nexusId: UInt64Type): Action {
        return this.server.action('wrapentity', {
            entity_id: UInt64.from(entityId),
            nexus_id: UInt64.from(nexusId),
        })
    }

    deploynft(owner: NameType, assetId: UInt64Type, targetNexusId: UInt64Type): Action {
        const params: ServerContract.ActionParams.deploynft = {
            owner: Name.from(owner),
            asset_id: UInt64.from(assetId),
            target_nexus_id: UInt64.from(targetNexusId),
        }
        return this.server.action('deploynft', params)
    }

    unwrapnft(owner: NameType, assetId: UInt64Type, hostId: UInt64Type): Action {
        const params: ServerContract.ActionParams.unwrapnft = {
            owner: Name.from(owner),
            asset_id: UInt64.from(assetId),
            host_id: UInt64.from(hostId),
        }
        return this.server.action('unwrapnft', params)
    }

    demolish(entityId: UInt64Type): Action {
        return this.server.action('demolish', {
            entity_id: UInt64.from(entityId),
        })
    }

    joinGame(account: NameType, companyName: string): Action[] {
        return [this.foundCompany(account, companyName), this.join(account)]
    }
}
