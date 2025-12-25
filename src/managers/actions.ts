import {Action, Int64, Name, NameType, UInt16, UInt32, UInt64, UInt64Type} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {Ship} from '../entities/ship'
import {CoordinatesType, EntityType, EntityTypeName} from '../types'
import {ServerContract} from '../contracts'

interface SellableCargo {
    good_id: {toNumber(): number} | number
    quantity: {toNumber(): number} | number
    hasCargo: boolean
}

export type CargoItemInput = {
    goodId: UInt64Type
    quantity: UInt64Type
    unitCost?: UInt64Type
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
        cargo: CargoItemInput[]
    ): Action {
        const cargoItems = cargo.map((c) =>
            ServerContract.Types.cargo_item.from({
                good_id: UInt16.from(c.goodId),
                quantity: UInt32.from(c.quantity),
                unit_cost: UInt64.from(c.unitCost || 0),
            })
        )
        return this.server.action('transfer', {
            source_type: sourceType,
            source_id: UInt64.from(sourceId),
            dest_type: destType,
            dest_id: UInt64.from(destId),
            cargo: cargoItems,
        })
    }

    buyGoods(shipId: UInt64Type, goodId: UInt64Type, quantity: UInt64Type): Action {
        return this.server.action('buygoods', {
            ship_id: UInt64.from(shipId),
            good_id: UInt64.from(goodId),
            quantity: UInt64.from(quantity),
        })
    }

    sellGoods(shipId: UInt64Type, goodId: UInt64Type, quantity: UInt64Type): Action {
        return this.server.action('sellgoods', {
            ship_id: UInt64.from(shipId),
            good_id: UInt64.from(goodId),
            quantity: UInt64.from(quantity),
        })
    }

    buyShip(account: NameType, name: string): Action {
        return this.server.action('buyship', {
            account: Name.from(account),
            name,
        })
    }

    buyWarehouse(account: NameType, shipId: UInt64Type, name: string): Action {
        return this.server.action('buywarehouse', {
            account: Name.from(account),
            ship_id: UInt64.from(shipId),
            name,
        })
    }

    takeLoan(account: NameType, amount: UInt64Type): Action {
        return this.server.action('takeloan', {
            account: Name.from(account),
            amount: UInt64.from(amount),
        })
    }

    payLoan(account: NameType, amount: UInt64Type): Action {
        return this.server.action('payloan', {
            account: Name.from(account),
            amount: UInt64.from(amount),
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

    joinGame(account: NameType, companyName: string): Action[] {
        return [this.foundCompany(account, companyName), this.join(account)]
    }

    sellAllCargo(ship: Ship | UInt64Type, cargo?: SellableCargo[]): Action[] {
        let shipCargo: SellableCargo[]

        if (ship instanceof Ship) {
            shipCargo = cargo || ship.inventory
        } else {
            if (!cargo) {
                throw new Error('cargo parameter required when ship is a UInt64Type')
            }
            shipCargo = cargo
        }

        const shipId = ship instanceof Ship ? ship.id : UInt64.from(ship)

        return shipCargo
            .filter((c) => c.hasCargo)
            .map((c) =>
                this.server.action('sellgoods', {
                    ship_id: shipId,
                    good_id: c.good_id,
                    quantity: c.quantity,
                })
            )
    }
}
