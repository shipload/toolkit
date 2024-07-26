import {assert} from 'chai'
import {marketprice, marketprices, ServerContract} from '$lib'
import {Checksum256Type, UInt16} from '@wharfkit/antelope'

suite('market', function () {
    const location: ServerContract.ActionParams.Type.coordinates = {x: 10, y: 20}
    const gameSeed: Checksum256Type = 'gameSeedSample'
    const epochSeed: Checksum256Type = 'epochSeedSample'

    // suite('getPriceRange', function () {
    //     test('should return correct price range based on roll value', function () {
    //         const testCases = [
    //             {goodId: 1, expectedMin: 0, expectedMax: 0},
    //             {goodId: 3, expectedMin: 42, expectedMax: 49},
    //             {goodId: 5, expectedMin: 61, expectedMax: 74},
    //         ]

    //         testCases.forEach(({goodId, expectedMin, expectedMax}) => {
    //             const good_id = UInt16.from(goodId)
    //             const {minPrice, maxPrice} = getPriceRange(location, good_id, gameSeed)

    //             assert.equal(~~minPrice, expectedMin, `Min price for good ${goodId}`)
    //             assert.equal(~~maxPrice, expectedMax, `Max price for good ${goodId}`)
    //         })
    //     })
    // })

    // suite('marketprice', function () {
    //     test('SDK output matches API and price falls within expected range', async function () {
    //         const good_id = UInt16.from(1)
    //         const price = await marketprice(location, good_id, gameSeed, epochSeed)

    //         // Specific price check
    //         assert.equal(price.toNumber(), 0, 'Price should match expected value')

    //         // Range check
    //         const {minPrice, maxPrice} = getPriceRange(location, good_id, gameSeed)
    //         const priceNumber = price.toNumber()

    //         assert.isAtLeast(
    //             priceNumber,
    //             minPrice,
    //             `Price ${priceNumber} is not less than minimum ${minPrice}`
    //         )
    //         assert.isAtMost(
    //             priceNumber,
    //             maxPrice,
    //             `Price ${priceNumber} is not greater than maximum ${maxPrice}`
    //         )
    //     })
    // })

    // suite('marketprices', function () {
    //     test('SDK output matches API and prices fall within expected ranges', async function () {
    //         const prices = await marketprices(location, gameSeed, epochSeed)

    //         assert(prices.length > 0)

    //         const expectedPrices = [
    //             {id: 1, price: 0},
    //             {id: 3, price: 43},
    //             {id: 4, price: 76},
    //             {id: 5, price: 62},
    //             {id: 7, price: 0},
    //             {id: 9, price: 0},
    //             {id: 10, price: 0},
    //             {id: 11, price: 0},
    //             {id: 13, price: 464},
    //             {id: 14, price: 490},
    //         ]

    //         const actualPrices = prices.map(({price, good}) => ({
    //             price: Number(price),
    //             id: Number(good.id),
    //         }))

    //         assert.deepEqual(actualPrices, expectedPrices, 'Prices should match expected values')

    //         prices.forEach(({price, good}) => {
    //             const {minPrice, maxPrice} = getPriceRange(location, good.id, gameSeed)
    //             const priceNumber = price.toNumber()

    //             assert.isAtLeast(
    //                 priceNumber,
    //                 minPrice,
    //                 `Price ${priceNumber} for good ${good.id} is not less than minimum ${minPrice}`
    //             )
    //             assert.isAtMost(
    //                 priceNumber,
    //                 maxPrice,
    //                 `Price ${priceNumber} for good ${good.id} is not greater than maximum ${maxPrice}`
    //             )
    //         })
    //     })
    // })
})
