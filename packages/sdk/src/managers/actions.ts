import {
    Action,
    Checksum256,
    type Checksum256Type,
    Int64,
    Name,
    type NameType,
    UInt8,
    type UInt8Type,
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
import {ATOMICASSETS_ABI, SHIPLOAD_COLLECTION} from '../nft/atomicassets'

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

    cancel(entityId: UInt64Type, laneKey: number, count: UInt64Type): Action {
        return this.server.action('cancel', {
            id: UInt64.from(entityId),
            lane_key: UInt8.from(laneKey),
            count: UInt64.from(count),
        })
    }

    recharge(entityId: UInt64Type): Action {
        return this.server.action('recharge', {
            id: UInt64.from(entityId),
        })
    }

    rename(entityId: UInt64Type, name: string): Action {
        return this.server.action('rename', {
            id: UInt64.from(entityId),
            name,
        })
    }

    refrshentity(entityId: UInt64Type): Action {
        return this.server.action('refrshentity', {
            entity_id: UInt64.from(entityId),
        })
    }

    load(
        id: UInt64Type,
        fromId: UInt64Type,
        items: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        return this.server.action('load', {
            id: UInt64.from(id),
            from_id: UInt64.from(fromId),
            items,
        })
    }

    unload(
        id: UInt64Type,
        toId: UInt64Type,
        items: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        return this.server.action('unload', {
            id: UInt64.from(id),
            to_id: UInt64.from(toId),
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
        inputs: ServerContract.ActionParams.Type.cargo_item[],
        target?: UInt64Type
    ): Action {
        const params: ServerContract.ActionParams.craft = {
            id: UInt64.from(entityId),
            recipe_id: UInt16.from(recipeId),
            quantity: UInt32.from(quantity),
            inputs,
        }
        if (target !== undefined) {
            params.target = UInt64.from(target)
        }
        return this.server.action('craft', params)
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

    claimplot(
        entityId: UInt64Type,
        targetItemId: UInt16Type,
        coords: ServerContract.ActionParams.Type.coordinates
    ): Action {
        return this.server.action('claimplot', {
            builder_id: UInt64.from(entityId),
            target_item_id: UInt16.from(targetItemId),
            coords,
        })
    }

    buildplot(entityId: UInt64Type, plotId: UInt64Type): Action {
        return this.server.action('buildplot', {
            builder_id: UInt64.from(entityId),
            plot_id: UInt64.from(plotId),
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

    swapmodule(
        entityId: UInt64Type,
        moduleIndex: number,
        moduleRef: ServerContract.ActionParams.Type.cargo_ref
    ): Action {
        return this.server.action('swapmodule', {
            entity_id: UInt64.from(entityId),
            module_index: moduleIndex,
            module_ref: moduleRef,
        })
    }

    async wrap(
        owner: NameType,
        entityId: UInt64Type,
        nexusId: UInt64Type,
        cargoId: UInt64Type,
        quantity: UInt64Type,
        opts: {claimRam?: boolean} = {}
    ): Promise<Action[]> {
        const actions: Action[] = [
            this.platform.action('wrapcargo', {
                game: this.server.account,
                owner: Name.from(owner),
                entity_id: UInt64.from(entityId),
                nexus_id: UInt64.from(nexusId),
                cargo_id: UInt64.from(cargoId),
                quantity: UInt64.from(quantity),
            }),
        ]
        const claimRam =
            opts.claimRam ?? (this.atomicAssetsAccount ?? 'atomicassets') !== 'atomicassets'
        if (claimRam) {
            actions.push(this.setLastPayer(owner, SHIPLOAD_COLLECTION))
        }
        return actions
    }

    undeploy(hostId: UInt64Type, targetId: UInt64Type): Action {
        return this.server.action('undeploy', {
            host_id: UInt64.from(hostId),
            target_id: UInt64.from(targetId),
        })
    }

    claimStarter(owner: NameType): Action {
        return this.server.action('claimstarter', {
            owner: Name.from(owner),
        })
    }

    async wrapEntity(
        owner: NameType,
        entityId: UInt64Type,
        nexusId: UInt64Type,
        opts: {claimRam?: boolean} = {}
    ): Promise<Action[]> {
        const actions: Action[] = [
            this.platform.action('wrapentity', {
                game: this.server.account,
                owner: Name.from(owner),
                entity_id: UInt64.from(entityId),
                nexus_id: UInt64.from(nexusId),
            }),
        ]
        const claimRam =
            opts.claimRam ?? (this.atomicAssetsAccount ?? 'atomicassets') !== 'atomicassets'
        if (claimRam) {
            actions.push(this.setLastPayer(owner, SHIPLOAD_COLLECTION))
        }
        return actions
    }

    placecargo(owner: NameType, hostId: UInt64Type, assetId: UInt64Type): Action {
        return this.server.action('placecargo', {
            owner: Name.from(owner),
            host_id: UInt64.from(hostId),
            asset_id: UInt64.from(assetId),
        })
    }

    placeentity(owner: NameType, assetId: UInt64Type, targetNexusId: UInt64Type): Action {
        return this.server.action('placeentity', {
            owner: Name.from(owner),
            asset_id: UInt64.from(assetId),
            target_nexus_id: UInt64.from(targetNexusId),
        })
    }

    transferForUnwrap(owner: NameType, assetId: UInt64Type): Action {
        return Action.from(
            {
                account: this.atomicAssetsAccount,
                name: 'transfer',
                authorization: [{actor: Name.from(owner), permission: 'active'}],
                data: {
                    from: Name.from(owner),
                    to: this.platform.account,
                    asset_ids: [UInt64.from(assetId)],
                    memo: 'unwrap',
                },
            },
            ATOMICASSETS_ABI
        )
    }

    // Two top-level actions the wallet signs to unwrap an NFT into a host's cargo.
    unwrapCargoTx(owner: NameType, assetId: UInt64Type, hostId: UInt64Type): Action[] {
        return [this.transferForUnwrap(owner, assetId), this.placecargo(owner, hostId, assetId)]
    }

    // Two top-level actions the wallet signs to place an entity NFT at a nexus.
    unwrapEntityTx(owner: NameType, assetId: UInt64Type, targetNexusId: UInt64Type): Action[] {
        return [
            this.transferForUnwrap(owner, assetId),
            this.placeentity(owner, assetId, targetNexusId),
        ]
    }

    setRamPayer(newPayer: NameType, assetId: UInt64Type): Action {
        return Action.from(
            {
                account: this.atomicAssetsAccount,
                name: 'setrampayer',
                authorization: [{actor: Name.from(newPayer), permission: 'active'}],
                data: {new_payer: Name.from(newPayer), asset_id: UInt64.from(assetId)},
            },
            ATOMICASSETS_ABI
        )
    }

    setLastPayer(owner: NameType, collectionName: NameType): Action {
        return Action.from(
            {
                account: this.atomicAssetsAccount,
                name: 'setlastpayer',
                authorization: [{actor: Name.from(owner), permission: 'active'}],
                data: {owner: Name.from(owner), collection_name: Name.from(collectionName)},
            },
            ATOMICASSETS_ABI
        )
    }

    demolish(entityId: UInt64Type): Action {
        return this.server.action('demolish', {
            entity_id: UInt64.from(entityId),
        })
    }

    joinGame(account: NameType, companyName: string): Action[] {
        return [this.foundCompany(account, companyName), this.join(account)]
    }

    commit(oracleId: NameType, epoch: UInt64Type, commit: Checksum256Type): Action {
        return this.server.action('commit', {
            oracle_id: Name.from(oracleId),
            epoch: UInt64.from(epoch),
            commit: Checksum256.from(commit),
        })
    }

    reveal(oracleId: NameType, epoch: UInt64Type, reveal: Checksum256Type): Action {
        return this.server.action('reveal', {
            oracle_id: Name.from(oracleId),
            epoch: UInt64.from(epoch),
            reveal: Checksum256.from(reveal),
        })
    }

    addoracle(oracleId: NameType): Action {
        return this.server.action('addoracle', {
            oracle_id: Name.from(oracleId),
        })
    }

    removeoracle(oracleId: NameType): Action {
        return this.server.action('removeoracle', {
            oracle_id: Name.from(oracleId),
        })
    }

    setthreshold(threshold: UInt8Type): Action {
        return this.server.action('setthreshold', {
            threshold: UInt8.from(threshold),
        })
    }

    cleanrsvp(epoch: UInt64Type, maxRows: UInt64Type): Action {
        return this.server.action('cleanrsvp', {
            epoch: UInt64.from(epoch),
            max_rows: UInt64.from(maxRows),
        })
    }
}
