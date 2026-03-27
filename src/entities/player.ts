import {
    Int64,
    Int64Type,
    Name,
    NameType,
    UInt32,
    UInt32Type,
    UInt64,
    UInt64Type,
} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'

export interface PlayerStateInput {
    owner: NameType
    balance: UInt64Type
    debt: UInt32Type
    networth: Int64Type
}

/**
 * Player helper class extending player_row with computed financial properties.
 * Provides easy access to balance, debt, networth, and loan calculations.
 */
export class Player extends ServerContract.Types.player_row {
    /**
     * Construct a Player instance from individual state pieces.
     * Used by UI's ReactivePlayer to reconstruct Player from reactive state.
     */
    static fromState(state: PlayerStateInput): Player {
        const playerRow = ServerContract.Types.player_row.from({
            owner: Name.from(state.owner),
            balance: UInt64.from(state.balance),
            debt: UInt32.from(state.debt),
            networth: Int64.from(state.networth),
        })
        return new Player(playerRow)
    }
    // Constants for game rules (match smart contract)
    private static readonly MAX_LOAN = 1000000
    // Contract formula: 2500 * pow(5, sequence - 1) = 500 * pow(5, sequence)
    private static readonly BASE_SHIP_COST = 500
    private static readonly SHIP_COST_MULTIPLIER = 5

    // Optional ship count for nextShipCost calculation
    private _shipCount?: number

    /**
     * Set the current ship count (needed for nextShipCost calculation)
     */
    setShipCount(count: number): void {
        this._shipCount = count
    }

    /**
     * Get the current ship count (if set)
     */
    get shipCount(): number | undefined {
        return this._shipCount
    }

    /**
     * Calculate the cost of the next ship based on current ship count
     * Matches contract: pow(5, sequence) * 100
     * @param shipCount - Optional ship count (uses cached value if not provided)
     */
    getNextShipCost(shipCount?: number): UInt64 {
        const count = shipCount ?? this._shipCount ?? 0
        const cost = Math.pow(Player.SHIP_COST_MULTIPLIER, count) * Player.BASE_SHIP_COST
        return UInt64.from(Math.floor(cost))
    }

    /**
     * Get the cost of the next ship based on cached ship count
     */
    get nextShipCost(): UInt64 {
        return this.getNextShipCost()
    }

    /**
     * Check if player can afford to buy a ship
     * @param shipCount - Optional ship count (uses cached value if not provided)
     */
    canBuyShip(shipCount?: number): boolean {
        return UInt64.from(this.balance).gte(this.getNextShipCost(shipCount))
    }

    /**
     * Calculate available loan amount (max loan - current debt)
     */
    get availableLoan(): UInt64 {
        const maxLoan = UInt64.from(Player.MAX_LOAN)
        if (UInt64.from(this.debt).gte(maxLoan)) {
            return UInt64.from(0)
        }
        return maxLoan.subtracting(this.debt)
    }

    /**
     * Check if player can take out a loan
     */
    get canTakeLoan(): boolean {
        return this.availableLoan.gt(UInt64.zero)
    }

    /**
     * Check if player can pay back loan
     */
    get canPayLoan(): boolean {
        return UInt64.from(this.debt).gt(UInt64.zero) && UInt64.from(this.balance).gt(UInt64.zero)
    }

    /**
     * Calculate maximum payback amount (min of debt and balance)
     */
    get maxPayback(): UInt64 {
        return UInt64.from(this.debt).lt(this.balance) ? this.debt : this.balance
    }

    /**
     * Get the maximum loan amount (constant)
     */
    static get MAX_LOAN_LIMIT(): number {
        return Player.MAX_LOAN
    }

    /**
     * Check if player is in debt
     */
    get hasDebt(): boolean {
        return UInt64.from(this.debt).gt(UInt64.zero)
    }

    /**
     * Check if player is solvent (positive networth)
     */
    get isSolvent(): boolean {
        return this.networth.gte(Int64.zero)
    }

    /**
     * Create an optimistic update for balance changes
     * Uses integer math to match contract
     * @param delta - Amount to change (can be negative)
     */
    withBalanceChange(delta: UInt64 | number): Player {
        const newPlayer = Player.from(this)
        const amount = typeof delta === 'number' ? UInt64.from(Math.abs(delta)) : delta

        if (typeof delta === 'number' && delta < 0) {
            // Subtract, ensuring we don't go below 0
            newPlayer.balance = UInt64.from(this.balance).gte(amount)
                ? this.balance.subtracting(amount)
                : UInt64.from(0)
        } else {
            // Add
            newPlayer.balance = this.balance.adding(amount)
        }

        // Calculate networth as Int64 (can be negative)
        const balanceInt = Int64.from(newPlayer.balance)
        const debtInt = Int64.from(newPlayer.debt)
        newPlayer.networth = balanceInt.subtracting(debtInt)
        return newPlayer
    }

    /**
     * Create an optimistic update for debt changes
     * Uses integer math to match contract
     * @param delta - Amount to change (can be negative)
     */
    withDebtChange(delta: UInt64 | number): Player {
        const newPlayer = Player.from(this)
        const amount = typeof delta === 'number' ? UInt64.from(Math.abs(delta)) : delta

        if (typeof delta === 'number' && delta < 0) {
            // Subtract, ensuring we don't go below 0
            newPlayer.debt = UInt64.from(this.debt).gte(amount)
                ? this.debt.subtracting(amount)
                : UInt64.from(0)
        } else {
            // Add
            newPlayer.debt = this.debt.adding(amount)
        }

        // Calculate networth as Int64 (can be negative)
        const balanceInt = Int64.from(newPlayer.balance)
        const debtInt = Int64.from(newPlayer.debt)
        newPlayer.networth = balanceInt.subtracting(debtInt)
        return newPlayer
    }

    /**
     * Create an optimistic update for taking a loan
     */
    withLoan(amount: UInt64): Player {
        const newPlayer = Player.from(this)
        newPlayer.balance = this.balance.adding(amount)
        newPlayer.debt = this.debt.adding(amount)
        // Calculate networth as Int64 (can be negative)
        const balanceInt = Int64.from(newPlayer.balance)
        const debtInt = Int64.from(newPlayer.debt)
        newPlayer.networth = balanceInt.subtracting(debtInt)
        return newPlayer
    }

    /**
     * Create an optimistic update for paying back a loan
     */
    withLoanPayment(amount: UInt64): Player {
        const actualPayment = this.maxPayback.lt(amount) ? this.maxPayback : amount
        const newPlayer = Player.from(this)
        newPlayer.balance = this.balance.subtracting(actualPayment)
        newPlayer.debt = this.debt.subtracting(actualPayment)
        // Calculate networth as Int64 (can be negative)
        const balanceInt = Int64.from(newPlayer.balance)
        const debtInt = Int64.from(newPlayer.debt)
        newPlayer.networth = balanceInt.subtracting(debtInt)
        return newPlayer
    }

    /**
     * Simulate networth update from selling goods.
     * Matches contract: networth += (sellPrice - paid * quantity)
     * Contract reference: market.cpp:75
     *
     * @param sellPrice - Total revenue from sale (price * quantity)
     * @param paidPerUnit - Average cost per unit paid (from cargo.paid)
     * @param quantity - Quantity being sold
     * @returns New player with updated networth
     *
     * @example
     * // Sold 10 units at 150 each (revenue=1500), paid 100 per unit
     * const newPlayer = player.withSaleNetworth(
     *     UInt64.from(1500),
     *     UInt64.from(100),
     *     UInt32.from(10)
     * )
     * // Networth increases by: 1500 - (100*10) = 500
     */
    withSaleNetworth(sellPrice: UInt64, paidPerUnit: UInt64, quantity: UInt64): Player {
        // Match contract: price - paid * quantity
        const cost = paidPerUnit.multiplying(quantity)
        const profit = sellPrice.gte(cost) ? sellPrice.subtracting(cost) : Int64.from(0)

        const newPlayer = Player.from(this)
        newPlayer.networth = Int64.from(this.networth).adding(profit)
        return newPlayer
    }

    /**
     * Simulate complete sell goods transaction.
     * Updates both balance (adds revenue) and networth (adds profit).
     * Matches contract actions: update_balance + update_networth
     *
     * @param sellPrice - Total revenue from sale (price * quantity)
     * @param paidPerUnit - Average cost per unit paid (from cargo.paid)
     * @param quantity - Quantity being sold
     * @returns New player with updated balance and networth
     */
    withSellGoods(sellPrice: UInt64, paidPerUnit: UInt64, quantity: UInt64): Player {
        const cost = paidPerUnit.multiplying(quantity)
        const profit = sellPrice.gte(cost) ? sellPrice.subtracting(cost) : Int64.from(0)

        const newPlayer = Player.from(this)
        newPlayer.balance = this.balance.adding(sellPrice)
        newPlayer.networth = Int64.from(this.networth).adding(profit)
        return newPlayer
    }

    /**
     * Simulate complete buy goods transaction.
     * Updates balance (subtracts cost).
     *
     * @param purchaseCost - Total cost of purchase (price * quantity)
     * @returns New player with updated balance
     */
    withBuyGoods(purchaseCost: UInt64): Player {
        const newPlayer = Player.from(this)
        newPlayer.balance = UInt64.from(this.balance).gte(purchaseCost)
            ? this.balance.subtracting(purchaseCost)
            : UInt64.from(0)
        // Calculate networth as Int64 (can be negative)
        const balanceInt = Int64.from(newPlayer.balance)
        const debtInt = Int64.from(newPlayer.debt)
        newPlayer.networth = balanceInt.subtracting(debtInt)
        return newPlayer
    }
}
