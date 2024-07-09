import {assert} from 'chai'
import {marketprice, marketprices, priceFromRoll, ServerContract} from '$lib'
import {Checksum256Type} from '@wharfkit/antelope'

suite('market', function () {
    suite('marketprice', function () {
        test('SDK output matches API', async function () {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 10, y: 20}
            const good_id = 1
            const gameSeed: Checksum256Type = 'gameSeedSample'
            const epochSeed: Checksum256Type = 'epochSeedSample'
            const price = await marketprice(location, good_id, gameSeed, epochSeed)

            assert.equal(price.toNumber(), 21)
        })
    })

    suite('marketprices', function () {
        test('SDK output matches API', async function () {
            const location: ServerContract.ActionParams.Type.coordinates = {x: 10, y: 20}
            const gameSeed: Checksum256Type = 'gameSeedSample'
            const epochSeed: Checksum256Type = 'epochSeedSample'
            const prices = await marketprices(location, gameSeed, epochSeed)

            assert(prices.length > 0)

            assert.deepEqual(
                prices.map(({price, good}) => ({price: Number(price), id: Number(good.id)})),
                [
                    {
                        id: 1,
                        price: 21,
                    },
                    // {
                    //     id: 2,
                    //     price: 0,
                    // },
                    {
                        id: 3,
                        price: 37,
                    },
                    {
                        id: 4,
                        price: 0,
                    },
                    {
                        id: 5,
                        price: 74,
                    },
                    // {
                    //     id: 6,
                    //     price: 0,
                    // },
                    {
                        id: 7,
                        price: 149,
                    },
                    // {
                    //     id: 8,
                    //     price: 166,
                    // },
                    {
                        id: 9,
                        price: 235,
                    },
                    {
                        id: 10,
                        price: 0,
                    },
                    {
                        id: 11,
                        price: 321,
                    },
                    // {
                    //     id: 12,
                    //     price: 374,
                    // },
                    {
                        id: 13,
                        price: 0,
                    },
                    {
                        id: 14,
                        price: 0,
                    },
                ]
            )
        })
    })

    suite('priceFromRoll', function () {
        test('should return base price multiplied by 2.25 when roll < 13', function () {
            const result = priceFromRoll(100, 10)
            assert.isTrue(result.equals(225))
        })

        test('should return base price multiplied by 1.75 when roll < 176', function () {
            const result = priceFromRoll(100, 100)
            assert.isTrue(result.equals(175))
        })

        test('should return base price multiplied by 1.4 when roll < 996', function () {
            const result = priceFromRoll(100, 500)
            assert.isTrue(result.equals(140))
        })

        test('should return base price multiplied by 1.225 when roll < 2966', function () {
            const result = priceFromRoll(100, 2000)
            assert.isTrue(result.equals(122))
        })

        test('should return base price multiplied by 1.07 when roll < 19568', function () {
            const result = priceFromRoll(100, 10000)
            assert.isTrue(result.equals(107))
        })

        test('should return 0 when roll < 45988', function () {
            const result = priceFromRoll(100, 30000)
            assert.isTrue(result.equals(0))
        })

        test('should return base price multiplied by 0.925 when roll < 62508', function () {
            const result = priceFromRoll(100, 50000)
            assert.isTrue(result.equals(92))
        })

        test('should return base price multiplied by 0.77 when roll < 64518', function () {
            const result = priceFromRoll(100, 63000)
            assert.isTrue(result.equals(77))
        })

        test('should return base price multiplied by 0.595 when roll < 65437', function () {
            const result = priceFromRoll(100, 65000)
            assert.isTrue(result.equals(59))
        })

        test('should return base price multiplied by 0.41 when roll < 65523', function () {
            const result = priceFromRoll(100, 65500)
            assert.isTrue(result.equals(41))
        })

        test('should return base price multiplied by 0.285 when roll >= 65523', function () {
            const result = priceFromRoll(100, 65523)
            assert.isTrue(result.equals(28))
        })
    })
})
