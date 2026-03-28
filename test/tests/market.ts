import {assert} from 'chai'
import {Bytes, Checksum256, UInt64} from '@wharfkit/antelope'
import {
    getLocationMultiplier,
    getRarity,
    getRarityMultiplier,
    getSupply,
    marketPrice,
    marketPrices,
    Rarities,
} from 'src/market'
import {ServerContract} from 'src/contracts'
import {getItem, getItems} from 'src/items'

function createMockState(epoch: number, ships: number, seedValue = 'testseed123') {
    const seed = Checksum256.hash(Bytes.from(seedValue, 'utf8'))
    return ServerContract.Types.state_row.from({
        enabled: true,
        epoch: UInt64.from(epoch),
        salt: UInt64.from(1),
        ships: UInt64.from(ships),
        seed,
        commit: Checksum256.from(
            '0000000000000000000000000000000000000000000000000000000000000000'
        ),
    })
}

suite('market', function () {
    const gameSeed = Checksum256.from(
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    )
    const location = {x: 0, y: 0}

    suite('getRarity', function () {
        test('returns rarity object with minMultiplier and maxMultiplier', function () {
            const state = createMockState(1, 10)
            const rarity = getRarity(gameSeed, state.seed, location, 1)
            assert.property(rarity, 'rarity')
            assert.property(rarity, 'minMultiplier')
            assert.property(rarity, 'maxMultiplier')
            assert.isNumber(rarity.minMultiplier)
            assert.isNumber(rarity.maxMultiplier)
            assert.isTrue(rarity.maxMultiplier >= rarity.minMultiplier)
        })

        test('rarity is one of the defined rarities', function () {
            const state = createMockState(1, 10)
            const rarity = getRarity(gameSeed, state.seed, location, 1)
            const validRarities = Object.values(Rarities)
            assert.include(validRarities, rarity.rarity)
        })

        test('different locations produce different rarities', function () {
            const state = createMockState(1, 10)
            const rarities = new Set<Rarities>()

            for (let x = 0; x < 100; x++) {
                for (let y = 0; y < 10; y++) {
                    const rarity = getRarity(gameSeed, state.seed, {x, y}, 1)
                    rarities.add(rarity.rarity)
                }
            }

            assert.isTrue(rarities.size > 1, 'Should produce multiple rarity types')
        })

        test('different good_ids produce different rarities', function () {
            const state = createMockState(1, 10)
            const goods = getItems()
            const rarities = new Set<Rarities>()

            for (let loc = 0; loc < 100; loc++) {
                for (const good of goods) {
                    const rarity = getRarity(gameSeed, state.seed, {x: loc, y: 0}, good.id)
                    rarities.add(rarity.rarity)
                }
            }

            assert.isTrue(rarities.size > 1, 'Should produce multiple rarity types across goods')
        })

        test('covers all rarity branches with varied seeds', function () {
            const raritiesFound = new Set<Rarities>()

            for (let i = 0; i < 5000; i++) {
                const seedStr = `testseed${i}`
                const testSeed = Checksum256.hash(Bytes.from(seedStr, 'utf8'))
                const epochSeed = Checksum256.hash(Bytes.from(`epoch${i}`, 'utf8'))
                const loc = {x: i % 100, y: Math.floor(i / 100)}
                const goodId = (i % 10) + 1

                const rarity = getRarity(testSeed, epochSeed, loc, goodId)
                raritiesFound.add(rarity.rarity)

                if (raritiesFound.size === 6) break
            }

            assert.isTrue(
                raritiesFound.size >= 3,
                `Should find at least 3 different rarities, found ${raritiesFound.size}`
            )
        })
    })

    suite('getRarityMultiplier', function () {
        test('returns a number between min and max multiplier', function () {
            const state = createMockState(1, 10)
            const rarity = getRarity(gameSeed, state.seed, location, 1)
            const multiplier = getRarityMultiplier(gameSeed, state.seed, location, 1)

            assert.isNumber(multiplier)
            assert.isAtLeast(multiplier, rarity.minMultiplier)
            assert.isAtMost(multiplier, rarity.maxMultiplier)
        })

        test('different locations produce different multipliers', function () {
            const state = createMockState(1, 10)
            const multipliers = new Set<number>()

            for (let x = 0; x < 20; x++) {
                const mult = getRarityMultiplier(gameSeed, state.seed, {x, y: 0}, 1)
                multipliers.add(mult)
            }

            assert.isTrue(multipliers.size > 1, 'Should produce different multipliers')
        })
    })

    suite('getLocationMultiplier', function () {
        test('returns a number', function () {
            const multiplier = getLocationMultiplier(gameSeed, location, 1)
            assert.isNumber(multiplier)
        })

        test('returns value between 0.75 and 1.25', function () {
            const multiplier = getLocationMultiplier(gameSeed, location, 1)
            assert.isAtLeast(multiplier, 0.75)
            assert.isAtMost(multiplier, 1.25)
        })

        test('covers various multiplier branches with varied inputs', function () {
            const multipliersFound = new Set<number>()

            for (let i = 0; i < 1000; i++) {
                const seedStr = `gameseed${i}`
                const testSeed = Checksum256.hash(Bytes.from(seedStr, 'utf8'))
                const loc = {x: i % 50, y: Math.floor(i / 50)}
                const goodId = (i % 10) + 1

                const mult = getLocationMultiplier(testSeed, loc, goodId)
                multipliersFound.add(mult)

                if (multipliersFound.size >= 8) break
            }

            assert.isTrue(
                multipliersFound.size >= 3,
                `Should find at least 3 different multipliers, found ${multipliersFound.size}`
            )
        })

        test('same inputs produce same output (deterministic)', function () {
            const mult1 = getLocationMultiplier(gameSeed, location, 1)
            const mult2 = getLocationMultiplier(gameSeed, location, 1)
            assert.equal(mult1, mult2)
        })
    })

    suite('getSupply', function () {
        test('returns a non-negative number', function () {
            const state = createMockState(1, 10)
            const supply = getSupply(gameSeed, state, location, 1)
            assert.isNumber(supply)
            assert.isAtLeast(supply, 0)
        })

        test('supply varies by location', function () {
            const state = createMockState(1, 10)
            const supplies = new Set<number>()

            for (let x = 0; x < 20; x++) {
                const supply = getSupply(gameSeed, state, {x, y: 0}, 1)
                supplies.add(supply)
            }

            assert.isTrue(supplies.size > 1, 'Supply should vary by location')
        })

        test('supply varies by good_id', function () {
            const state = createMockState(1, 10)
            const goods = getItems()
            const supplies = new Set<number>()

            for (const good of goods) {
                const supply = getSupply(gameSeed, state, location, good.id)
                supplies.add(supply)
            }

            assert.isTrue(supplies.size > 1, 'Supply should vary by good')
        })

        test('higher good_id generally means lower supply (128/good_id factor)', function () {
            const state = createMockState(1, 10)
            const supplyId1 = getSupply(gameSeed, state, location, 1)
            const supplyId14 = getSupply(gameSeed, state, location, 14)

            assert.isTrue(supplyId1 >= supplyId14, 'Lower good_id should have higher base supply')
        })

        test('supply is unaffected by ships count (contract bug: pow(ships, 1/3) = pow(ships, 0) = 1)', function () {
            const state1 = createMockState(1, 1)
            const state100 = createMockState(1, 100)

            const supply1 = getSupply(gameSeed, state1, location, 1)
            const supply100 = getSupply(gameSeed, state100, location, 1)

            assert.equal(
                supply100,
                supply1,
                'Ships count should not affect supply due to contract bug'
            )
        })

        test('supply increases with higher epoch', function () {
            const state1 = createMockState(1, 10)
            const state100 = createMockState(100, 10)

            const supply1 = getSupply(gameSeed, state1, location, 1)
            const supply100 = getSupply(gameSeed, state100, location, 1)

            assert.isTrue(supply100 > supply1, 'Higher epoch should mean more supply')
        })
    })

    suite('marketPrice', function () {
        test('returns ItemPrice with correct structure', function () {
            const state = createMockState(1, 10)
            const price = marketPrice(location, 1, gameSeed, state)

            assert.property(price, 'id')
            assert.property(price, 'item')
            assert.property(price, 'price')
            assert.property(price, 'supply')
        })

        test('price is a positive value', function () {
            const state = createMockState(1, 10)
            const price = marketPrice(location, 1, gameSeed, state)

            assert.isTrue(price.price.toNumber() > 0)
        })

        test('returns correct good for good_id', function () {
            const state = createMockState(1, 10)
            const price = marketPrice(location, 26, gameSeed, state)
            const expectedGood = getItem(26)

            assert.equal(price.item.name, expectedGood.name)
            assert.isTrue(price.item.id.equals(expectedGood.id))
        })

        test('price is influenced by rarity and location multipliers', function () {
            const state = createMockState(1, 10)
            const good = getItem(1)
            const basePrice = Number(good.base_price)
            const price = marketPrice(location, 1, gameSeed, state)

            assert.notEqual(
                price.price.toNumber(),
                basePrice,
                'Price should be modified by multipliers'
            )
        })

        test('different locations produce different prices', function () {
            const state = createMockState(1, 10)
            const prices = new Set<number>()

            for (let x = 0; x < 20; x++) {
                const price = marketPrice({x, y: 0}, 1, gameSeed, state)
                prices.add(price.price.toNumber())
            }

            assert.isTrue(prices.size > 1, 'Prices should vary by location')
        })
    })

    suite('marketPrices', function () {
        test('returns array of ItemPrice for all items', function () {
            const state = createMockState(1, 10)
            const prices = marketPrices(location, gameSeed, state)

            assert.isArray(prices)
            assert.equal(prices.length, getItems().length)
        })

        test('each price corresponds to a different good', function () {
            const state = createMockState(1, 10)
            const prices = marketPrices(location, gameSeed, state)
            const goodIds = prices.map((p) => Number(p.id))
            const uniqueIds = new Set(goodIds)

            assert.equal(uniqueIds.size, prices.length, 'All good IDs should be unique')
        })

        test('all prices are positive', function () {
            const state = createMockState(1, 10)
            const prices = marketPrices(location, gameSeed, state)

            prices.forEach((p) => {
                assert.isTrue(p.price.toNumber() > 0, `Price for ${p.item.name} should be positive`)
            })
        })
    })
})
