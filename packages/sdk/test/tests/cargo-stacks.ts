import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {
    type CargoStack,
    cargoItemToStack,
    INSUFFICIENT_ITEM_QUANTITY,
    mergeStacks,
    removeFromStacks,
    ServerContract,
    stackKey,
    stacksEqual,
} from '$lib'

function stack(item_id: number, quantity: number, stats?: number): CargoStack {
    return {
        item_id: UInt16.from(item_id),
        quantity: UInt32.from(quantity),
        stats: stats === undefined ? UInt64.from(0) : UInt64.from(stats),
        modules: [],
    }
}

function engine(stats: number): ServerContract.Types.module_entry {
    return ServerContract.Types.module_entry.from({type: 1, installed: {item_id: 10100, stats}})
}

describe('CargoStack helpers', () => {
    describe('stackKey', () => {
        test('keys by item_id and seed', () => {
            assert.equal(stackKey(stack(5, 10, 42)), '5:42')
        })

        test('treats undefined seed as 0', () => {
            assert.equal(stackKey(stack(5, 10)), '5:0')
        })

        test('keys installed modules and sequence id apart', () => {
            assert.equal(
                stackKey({...stack(5, 10, 42), modules: [engine(7)], entity_id: UInt64.from(9)}),
                '5:42:0=10100.7#9'
            )
        })
    })

    describe('stack identity', () => {
        test('keeps stacks that differ only by installed modules apart', () => {
            const result = mergeStacks(
                [{...stack(1, 5, 10), modules: [engine(1)]}],
                stack(1, 3, 10)
            )
            assert.equal(result.length, 2)
        })

        test('merges stacks whose installed modules match', () => {
            const result = mergeStacks([{...stack(1, 5, 10), modules: [engine(1)]}], {
                ...stack(1, 3, 10),
                modules: [engine(1)],
            })
            assert.equal(result.length, 1)
            assert.equal(result[0].quantity.toNumber(), 8)
        })

        test('never merges an individuated unit', () => {
            const unit = cargoItemToStack(
                ServerContract.Types.cargo_item.from({
                    item_id: 1,
                    quantity: 1,
                    stats: 10,
                    modules: [],
                    entity_id: 4,
                })
            )
            assert.equal(mergeStacks([stack(1, 5, 10)], unit).length, 2)
            assert.equal(mergeStacks([unit], unit).length, 2)
        })

        test('treats a zero sequence id as a plain stack', () => {
            const plain = cargoItemToStack(
                ServerContract.Types.cargo_item.from({
                    item_id: 1,
                    quantity: 2,
                    stats: 10,
                    modules: [],
                    entity_id: 0,
                })
            )
            assert.isUndefined(plain.entity_id)
            assert.equal(mergeStacks([stack(1, 5, 10)], plain).length, 1)
        })
    })

    describe('mergeStacks', () => {
        test('appends a new stack with no match', () => {
            const result = mergeStacks([stack(1, 5, 10)], stack(2, 3, 20))
            assert.equal(result.length, 2)
            assert.equal(result[1].item_id.toNumber(), 2)
        })

        test('merges quantity into matching (item_id, seed)', () => {
            const result = mergeStacks([stack(1, 5, 10)], stack(1, 7, 10))
            assert.equal(result.length, 1)
            assert.equal(result[0].quantity.toNumber(), 12)
        })

        test('keeps separate stacks for different seeds', () => {
            const result = mergeStacks([stack(1, 5, 10)], stack(1, 7, 20))
            assert.equal(result.length, 2)
        })

        test('merges by item_id when both stacks have undefined seed', () => {
            const result = mergeStacks([stack(1, 5)], stack(1, 7))
            assert.equal(result.length, 1)
            assert.equal(result[0].quantity.toNumber(), 12)
        })
    })

    describe('removeFromStacks', () => {
        test('decrements quantity from matching stack', () => {
            const result = removeFromStacks([stack(1, 10, 5)], stack(1, 3, 5))
            assert.equal(result.length, 1)
            assert.equal(result[0].quantity.toNumber(), 7)
        })

        test('removes stack when quantity reaches zero', () => {
            const result = removeFromStacks([stack(1, 10, 5)], stack(1, 10, 5))
            assert.equal(result.length, 0)
        })

        test('throws INSUFFICIENT_ITEM_QUANTITY on underflow', () => {
            assert.throws(
                () => removeFromStacks([stack(1, 5, 5)], stack(1, 10, 5)),
                INSUFFICIENT_ITEM_QUANTITY
            )
        })

        test('throws INSUFFICIENT_ITEM_QUANTITY when stack absent', () => {
            assert.throws(
                () => removeFromStacks([stack(1, 5, 5)], stack(2, 1, 5)),
                INSUFFICIENT_ITEM_QUANTITY
            )
        })
    })

    describe('cargoItemToStack', () => {
        test('coerces plain bigint stats into UInt64 (CLI snapshot path)', () => {
            const plain = {
                item_id: 1n,
                quantity: 10n,
                stats: 5n,
                modules: [],
            } as never
            const result = cargoItemToStack(plain)
            assert.instanceOf(result.stats, UInt64)
            assert.instanceOf(result.item_id, UInt16)
            assert.instanceOf(result.quantity, UInt32)
        })

        test('removeFromStacks works after cargoItemToStack on plain bigint input', () => {
            const plainExisting = {
                item_id: 1n,
                quantity: 10n,
                stats: 5n,
                modules: [],
            } as never
            const projectedStack = cargoItemToStack(plainExisting)
            const wharfRemove: CargoStack = {
                item_id: UInt16.from(1),
                quantity: UInt32.from(3),
                stats: UInt64.from(5),
                modules: [],
            }
            const result = removeFromStacks([projectedStack], wharfRemove)
            assert.equal(result.length, 1)
            assert.equal(result[0].quantity.toNumber(), 7)
        })
    })

    describe('stacksEqual', () => {
        test('true for identical stacks', () => {
            assert.isTrue(stacksEqual(stack(1, 5, 10), stack(1, 5, 10)))
        })

        test('false on quantity mismatch', () => {
            assert.isFalse(stacksEqual(stack(1, 5, 10), stack(1, 6, 10)))
        })

        test('false on seed mismatch', () => {
            assert.isFalse(stacksEqual(stack(1, 5, 10), stack(1, 5, 20)))
        })
    })
})
