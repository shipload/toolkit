import {UInt32, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {getGood} from '../market/goods'
import {Good} from '../types'

export class EntityInventory extends ServerContract.Types.cargo_item {
    private _good?: Good

    get good(): Good {
        if (!this._good) {
            this._good = getGood(this.good_id)
        }
        return this._good
    }

    get name(): string {
        return this.good.name
    }

    get unitMass(): UInt32 {
        return this.good.mass
    }

    get totalMass(): UInt64 {
        return UInt64.from(this.unitMass).multiplying(this.quantity)
    }

    get totalCost(): UInt64 {
        return this.unit_cost.multiplying(this.quantity)
    }

    get hasCargo(): boolean {
        return UInt32.from(this.quantity).gt(UInt32.from(0))
    }

    get isEmpty(): boolean {
        return UInt32.from(this.quantity).equals(UInt32.from(0))
    }
}
