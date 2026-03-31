import {UInt32, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {getItem} from '../market/items'
import {Item} from '../types'

export class EntityInventory extends ServerContract.Types.cargo_item {
    private _item?: Item

    get item(): Item {
        if (!this._item) {
            this._item = getItem(this.item_id)
        }
        return this._item
    }

    get good(): Item {
        return this.item
    }

    get name(): string {
        return this.item.name
    }

    get unitMass(): UInt32 {
        return this.item.mass
    }

    get totalMass(): UInt64 {
        return UInt64.from(this.unitMass).multiplying(this.quantity)
    }

    get hasCargo(): boolean {
        return UInt32.from(this.quantity).gt(UInt32.from(0))
    }

    get isEmpty(): boolean {
        return UInt32.from(this.quantity).equals(UInt32.from(0))
    }
}
