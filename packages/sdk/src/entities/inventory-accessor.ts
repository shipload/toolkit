import {UInt64, UInt64Type} from '@wharfkit/antelope'
import {EntityInventory} from './entity-inventory'
import {HasCargo} from '../capabilities/storage'

export type {HasCargo}

export class InventoryAccessor {
    private _items?: EntityInventory[]

    constructor(private readonly entity: HasCargo) {}

    get items(): EntityInventory[] {
        if (!this._items) {
            this._items = this.entity.cargo.map((item) => new EntityInventory(item))
        }
        return this._items
    }

    get totalMass(): UInt64 {
        return this.items.reduce((sum, c) => sum.adding(c.totalMass), UInt64.from(0))
    }

    forItem(goodId: UInt64Type): EntityInventory | undefined {
        return this.items.find((c) => c.item_id.equals(goodId))
    }

    get sellable(): EntityInventory[] {
        return this.items.filter((c) => c.hasCargo)
    }

    get hasSellable(): boolean {
        return this.items.some((c) => c.hasCargo)
    }

    get sellableCount(): number {
        return this.items.filter((c) => c.hasCargo).length
    }
}

export function createInventoryAccessor(entity: HasCargo): InventoryAccessor {
    return new InventoryAccessor(entity)
}
