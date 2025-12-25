import {assert} from 'chai'
import {getGood, getGoods, goodIds} from 'src/goods'

suite('goods', function () {
    suite('getGood', function () {
        test('returns good for valid id', function () {
            const good = getGood(1)
            assert.isDefined(good)
            assert.equal(Number(good.id), 1)
        })

        test('throws error for invalid good id', function () {
            assert.throws(() => {
                getGood(999)
            }, 'Good does not exist')
        })
    })

    suite('getGoods', function () {
        test('returns all goods', function () {
            const goods = getGoods()
            assert.isArray(goods)
            assert.equal(goods.length, goodIds.length)
        })
    })

    suite('goodIds', function () {
        test('contains valid good ids', function () {
            assert.isArray(goodIds)
            assert.isTrue(goodIds.length > 0)
            assert.include(goodIds, 1)
        })
    })
})
