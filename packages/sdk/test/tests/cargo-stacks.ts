import {assert} from 'chai'
import {UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {
    type CargoStack,
    INSUFFICIENT_ITEM_QUANTITY,
    mergeStacks,
    removeFromStacks,
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

suite('CargoStack helpers', () => {
    suite('stackKey', () => {
        test('keys by item_id and seed', () => {
            assert.equal(stackKey(stack(5, 10, 42)), '5:42')
        })

        test('treats undefined seed as 0', () => {
            assert.equal(stackKey(stack(5, 10)), '5:0')
        })
    })

    suite('mergeStacks', () => {
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

    suite('removeFromStacks', () => {
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

    suite('stacksEqual', () => {
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
