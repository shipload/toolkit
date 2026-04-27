import {assert} from 'chai'
import {Player} from 'src/entities/player'

suite('Player', function () {
    suite('fromState', function () {
        test('creates player from state input', function () {
            const player = Player.fromState({owner: 'testplayer'})
            assert.equal(player.owner.toString(), 'testplayer')
        })
    })

    suite('from', function () {
        test('creates player from row data', function () {
            const player = Player.from({owner: 'testplayer'})
            assert.equal(player.owner.toString(), 'testplayer')
        })
    })
})
