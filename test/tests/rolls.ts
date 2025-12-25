import assert from 'assert'
import {Checksum256} from '@wharfkit/antelope'
import {roll} from '../../src/market/rolls'

suite('roll', function () {
    test('roll values', function () {
        const seed = Checksum256.from(
            '0be1140ada53742f96d665c114fa693bd1512f886b6949b08b570fd70b764e83'
        )
        const epochseed = '0202020202020202020202020202020202020202020202020202020202020202'
        const location = {x: 10, y: 20}
        const good_id = 1
        const rollSeed = `${location.x}${epochseed}${location.y}${good_id}`
        const rollValue = roll(seed, rollSeed)
        assert.equal(rollValue, 61436) // Adjust the expected value based on the correct calculation
    })
})
